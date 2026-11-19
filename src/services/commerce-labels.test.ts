import { expect, it } from 'vitest';
import { commerceStateLabel, historicalMembershipActionLabel } from './commerce-labels';

it('labels every known commerce state/kind in VI/EN while leaving unknown technical values unchanged', () => {
  const values = ['COURSE', 'MEMBERSHIP', 'DRAFT', 'ACTIVE', 'ARCHIVED', 'PUBLISHED', 'PUBLIC', 'PRIVATE', 'UNLISTED', 'CLEAR', 'HIDDEN', 'FLAGGED', 'BLOCKED',
    'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'LATE_PAYMENT_REVIEW', 'LATE_PAYMENT_REFUNDED', 'NOT_STARTED', 'PROCESSING', 'FULFILLED', 'FAILED',
    'CREATED', 'PENDING', 'PAID', 'LATE_PAID', 'PROVIDER_COLLECTION', 'NO_PAYMENT_REQUIRED', 'WALLET_CAPTURE', 'MATCHED', 'DUPLICATE_COLLECTION', 'LATE_COLLECTION',
    'INTERNAL', 'LATE_PAYMENT', 'PROVIDER_OUTAGE', 'PROVIDER_FACT_MISMATCH', 'UNKNOWN_PROVIDER_STATUS', 'PAID_NOT_FULFILLED', 'OPEN', 'RESOLVED', 'REQUESTED', 'RECORDED', 'REJECTED', 'RESERVED', 'CONSUMED', 'RELEASED'];
  for (const value of values) {
    const vi = commerceStateLabel(value, text => text), en = commerceStateLabel(value, (_, text) => text);
    expect(vi.trim().length).toBeGreaterThan(0); expect(en.trim().length).toBeGreaterThan(0);
    expect(vi).not.toBe(value); expect(en).not.toBe(value); expect(vi).not.toBe(en);
  }
  expect(commerceStateLabel('AUTHORED_REASON', text => text)).toBe('AUTHORED_REASON');
  expect(commerceStateLabel('authored/id', (_, text) => text)).toBe('authored/id');
});

it('keeps historical membership action meanings separate from new card presentation', () => {
  const en = (_: string, text: string) => text;
  expect(['PURCHASE', 'RENEW', 'UPGRADE', 'DOWNGRADE'].map(action => historicalMembershipActionLabel(action, en)))
    .toEqual(['New plan purchase', 'Membership renewal', 'Plan upgrade', 'Plan downgrade']);
  expect(historicalMembershipActionLabel('UNKNOWN', en)).toBe('Membership plan');
  expect(historicalMembershipActionLabel('constructor', en)).toBe('Membership plan');
});
