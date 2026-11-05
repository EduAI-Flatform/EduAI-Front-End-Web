import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRecipientCheck } from './AdminRecipientCheck';
import { gdsWithdrawalService, type Withdrawal } from '../../services/gds-withdrawal.service';
const item = { id: 'request-1', status: 'PENDING', accountHolder: 'NGUYEN DANG ANH' } as Withdrawal;
afterEach(() => vi.restoreAllMocks());
describe('admin manual recipient review', () => {
  it('approves with one explicit button without entering another name, checkbox or note', async () => {
    const confirm = vi.spyOn(gdsWithdrawalService, 'confirmRecipient').mockResolvedValue({ ...item, status: 'PROCESSING' });
    const lookup = vi.spyOn(gdsWithdrawalService, 'adminVerifyAccount');
    const changed = vi.fn();
    render(<AdminRecipientCheck item={item} disabled={false} onChanged={changed} />);
    const submit = screen.getByRole('button', { name: 'Xác nhận đúng & duyệt' });
    expect(submit).toBeEnabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(submit);
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(item.id, { confirmed: true }));
    expect(lookup).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ status: 'PROCESSING' }));
  });
  it('prevents repeated clicks while approval is pending', async () => {
    const confirm = vi.spyOn(gdsWithdrawalService, 'confirmRecipient').mockReturnValue(new Promise(() => {}));
    render(<AdminRecipientCheck item={item} disabled={false} onChanged={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Xác nhận đúng & duyệt' });
    fireEvent.click(button); fireEvent.click(button);
    expect(confirm).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
  });
});
