import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GdsWithdrawalAction } from './GdsWithdrawalAction';
import type { GdsWalletSummary } from '../../services/gds-wallet.service';
const summary: GdsWalletSummary = { available: true, mode: 'sandbox', state: 'READY_SANDBOX', balance: { settledMinor: '150000', availableMinor: '100000', reservedMinor: '50000', currency: 'VND' }, withdrawalEnabled: true, debtMinor: '0', paymentEnabled: true, topupEnabled: true };
const settings = { minimumMinor: '10000', maximumMinor: '10000000', version: 1, admissionEnabled: true, processingEnabled: true };
describe('withdrawal action and financial context', () => {
  it('separates held balance and zero debt, shows dynamic limits and opens withdrawal', () => {
    const withdraw = vi.fn();
    render(<GdsWithdrawalAction summary={summary} settings={{ ...settings, minimumMinor: '20000', maximumMinor: '5000000' }} disabled={false} onWithdraw={withdraw} />);
    expect(within(screen.getByText('Đang giữ').closest('div')!).getByText('50.000 ₫')).toBeVisible();
    expect(within(screen.getByText('Công nợ').closest('div')!).getByText('0 ₫')).toBeVisible();
    expect(screen.getByText('Tiền tạm giữ cho đơn hàng và yêu cầu rút tiền.')).toBeVisible();
    expect(screen.getByText('Không có công nợ cần bù.')).toBeVisible();
    expect(screen.getByText(/20.000 ₫ – 5.000.000 ₫/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rút tiền' })); expect(withdraw).toHaveBeenCalledOnce();
  });
  it('blocks withdrawal while debt exists even if the caller enables it', () => {
    const withdraw = vi.fn();
    render(<GdsWithdrawalAction summary={{ ...summary, debtMinor: '20000' }} settings={settings} disabled={false} onWithdraw={withdraw} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Doanh thu tiếp theo sẽ bù công nợ trước khi cộng vào GDS.');
    fireEvent.click(screen.getByRole('button', { name: 'Rút tiền' })); expect(withdraw).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rút tiền' })).toBeDisabled(); expect(screen.queryByText('Không có công nợ cần bù.')).not.toBeInTheDocument();
  });
  it('shows unknown data as a dash without claiming zero debt or inventing limits', () => {
    render(<GdsWithdrawalAction summary={{ ...summary, balance: null, debtMinor: undefined }} settings={null} disabled onWithdraw={vi.fn()} />);
    expect(screen.getAllByText('—')).toHaveLength(2); expect(screen.queryByText('0 ₫')).not.toBeInTheDocument();
    expect(screen.queryByText('Không có công nợ cần bù.')).not.toBeInTheDocument(); expect(screen.getByText('Hạn mức đang được cập nhật.')).toBeVisible();
  });
  it('keeps caller restrictions and renders existing operational messages', () => {
    render(<GdsWithdrawalAction summary={summary} settings={settings} disabled onWithdraw={vi.fn()}><p role="status">Đang tạm ngừng nhận yêu cầu mới.</p></GdsWithdrawalAction>);
    expect(screen.getByRole('button', { name: 'Rút tiền' })).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('Đang tạm ngừng nhận yêu cầu mới.');
  });
});
