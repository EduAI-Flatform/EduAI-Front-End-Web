import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WithdrawalInformation } from './WithdrawalRecords';
import { WITHDRAWAL_STATUSES, withdrawalLabels, type Withdrawal } from '../../services/gds-withdrawal.service';

const item: Withdrawal = { id: 'request-1', amountMinor: '10000', status: 'PENDING', bankCode: 'TPB', accountNumber: '0012345678', accountHolder: 'NGUYEN VAN AN', createdAt: '2026-11-05T01:00:00Z', currency: 'VND', processingAdminId: null, bankTransactionRef: null, transferredAt: null };
describe('withdrawal detail presentation', () => {
  it('shows a single waiting-for-transfer timeline entry for combined approval and claim', () => {
    render(<WithdrawalInformation item={{ ...item, status: 'PROCESSING', events: [
      { id: 'approve', fromStatus: 'PENDING', toStatus: 'APPROVED', reason: 'Đã duyệt', actorId: 'admin', createdAt: item.createdAt },
      { id: 'claim', fromStatus: 'APPROVED', toStatus: 'PROCESSING', reason: 'Chờ chuyển tiền', actorId: 'admin', createdAt: item.createdAt },
    ] }} />);
    expect(screen.getAllByText('Chờ chuyển khoản')).toHaveLength(2);
    expect(screen.queryByText('Đã duyệt')).not.toBeInTheDocument();
    expect(screen.getByText('Chờ chuyển tiền')).toBeVisible();
  });
  it.each(WITHDRAWAL_STATUSES)('shows a distinct labeled status for %s', status => {
    render(<WithdrawalInformation item={{ ...item, status }} />);
    expect(screen.getByText(withdrawalLabels[status])).toHaveAttribute('data-withdrawal-status', status);
    expect(screen.getByText(withdrawalLabels[status]).querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('0012345678')).toBeVisible();
    expect(screen.getByText('Chưa có cập nhật xử lý.')).toBeVisible();
  });
  it('keeps hidden recipients hidden and renders audited reasons in the timeline', () => {
    render(<WithdrawalInformation hideRecipient item={{ ...item, events: [{ id: 'event-1', fromStatus: null, toStatus: 'PENDING', reason: 'Yêu cầu được tạo', createdAt: item.createdAt, actorId: 'user-1' }] }} />);
    expect(screen.queryByText(item.accountNumber)).not.toBeInTheDocument();
    expect(screen.queryByText(item.accountHolder)).not.toBeInTheDocument();
    expect(screen.getByText('Yêu cầu được tạo')).toBeVisible();
    expect(screen.queryByText('Chưa có cập nhật xử lý.')).not.toBeInTheDocument();
  });
});
