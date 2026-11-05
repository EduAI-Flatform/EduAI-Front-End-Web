import { Ban, Check, CircleCheck, CircleX, Clock3, Send, X } from 'lucide-react';
import { withdrawalLabels, type WithdrawalStatus } from '../../services/gds-withdrawal.service';
import './WithdrawalStatusBadge.css';
import { withdrawalStatusTones, type WithdrawalStatusTone } from './withdrawal-status';

const icons = { pending: Clock3, approved: Check, processing: Send, paid: CircleCheck, cancelled: Ban, rejected: X, failed: CircleX, neutral: Clock3 };
export function WithdrawalStatusBadge({ status, label, tone = 'neutral' }: { status?: WithdrawalStatus; label?: string; tone?: WithdrawalStatusTone }) {
  const resolvedTone = status ? withdrawalStatusTones[status] : tone;
  const Icon = icons[resolvedTone];
  return <span className={`withdrawal-status-badge withdrawal-status-badge--${resolvedTone}`} data-withdrawal-status={status}><Icon size={13} aria-hidden="true" />{status ? withdrawalLabels[status] : label}</span>;
}
