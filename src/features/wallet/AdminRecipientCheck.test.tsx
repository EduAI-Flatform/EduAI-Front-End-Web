import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRecipientCheck } from './AdminRecipientCheck';
import { gdsWithdrawalService, type Withdrawal } from '../../services/gds-withdrawal.service';
const item = { id: 'request-1', status: 'PENDING', accountHolder: 'NGUYEN DANG ANH' } as Withdrawal;
afterEach(() => vi.restoreAllMocks());
describe('admin manual recipient review', () => {
  it('requires the actual matched bank name, checked confirmation and note before approving', async () => {
    const confirm = vi.spyOn(gdsWithdrawalService, 'confirmRecipient').mockResolvedValue({ ...item, status: 'APPROVED' });
    const lookup = vi.spyOn(gdsWithdrawalService, 'adminVerifyAccount');
    const changed = vi.fn();
    render(<AdminRecipientCheck item={item} disabled={false} onChanged={changed} />);
    const submit = screen.getByRole('button', { name: 'Xác nhận đúng & duyệt' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tên người nhận trên ứng dụng ngân hàng'), { target: { value: 'TRAN VAN B' } });
    expect(screen.getByRole('alert')).toHaveTextContent('không khớp');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tên người nhận trên ứng dụng ngân hàng'), { target: { value: 'Nguyễn Đặng Ánh' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Ghi chú đối chiếu'), { target: { value: 'Đã kiểm tra trên ngân hàng' } });
    fireEvent.click(submit);
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(item.id, { confirmed: true, accountHolder: 'Nguyễn Đặng Ánh', reason: 'Đã kiểm tra trên ngân hàng' }));
    expect(lookup).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
  });
});
