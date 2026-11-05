import type { WithdrawalStatus } from '../../services/gds-withdrawal.service';

export const withdrawalStatusTones = { PENDING: 'pending', APPROVED: 'approved', PROCESSING: 'processing', PAID: 'paid', CANCELLED: 'cancelled', REJECTED: 'rejected', FAILED: 'failed' } as const;
export type WithdrawalStatusTone = typeof withdrawalStatusTones[WithdrawalStatus] | 'neutral';
