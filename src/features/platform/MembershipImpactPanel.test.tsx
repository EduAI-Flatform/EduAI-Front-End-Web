import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MembershipImpactPanel } from './MembershipImpactPanel';
import type { MembershipImpact } from '../../services/platform-settings.service';

function impact(): MembershipImpact {
  return { status: 'evaluated', reason: null, policyRevisionId: 'revision', evaluatedUsers: 1, totalUsers: 1,
    projectedChangesOnPage: 0, projectedBenefitChangesOnPage: 1, nextCursor: null, complete: true,
    items: [{ userId: 'owner', previousTierCode: 'member', projectedBenefitsChanged: true,
      previousBenefits: [{ vi: 'Quyền lợi cũ', en: 'Previous benefit' }], evaluation: {
        basis: 'topup', status: 'evaluated', reason: null, policyRevisionId: 'revision', qualifyingAmountMinor: '100000',
        currency: 'VND', windowStartsAt: null, windowEndsAt: null, evaluatedAt: null,
        tier: { code: 'member', name: { vi: 'Thẻ thành viên', en: 'Member' }, threshold: 0,
          benefits: [{ vi: 'Quyền lợi mới', en: 'New benefit' }] },
      } }],
  };
}
describe('membership impact details', () => {
  it('labels top-up qualification and shows benefit changes separately from tier changes', () => {
    render(<MembershipImpactPanel initial={impact()} />);
    expect(screen.getByText(/Nạp tiền đủ điều kiện.*100000/)).toBeInTheDocument();
    expect(screen.getByText(/Số tài khoản đổi quyền lợi trên trang.*1/)).toBeInTheDocument();
    expect(screen.getByText(/Quyền lợi trước.*Quyền lợi cũ/)).toBeInTheDocument();
    expect(screen.getByText(/Quyền lợi sau.*Quyền lợi mới/)).toBeInTheDocument();
    expect(screen.queryByText(/Chi tiêu đủ điều kiện/)).not.toBeInTheDocument();
  });
  it('preserves the spending label for earlier API responses without the additive basis field', () => {
    const initial = impact();
    delete initial.items[0].evaluation.basis;
    render(<MembershipImpactPanel initial={initial} />);
    expect(screen.getByText(/Chi tiêu đủ điều kiện.*100000/)).toBeInTheDocument();
  });
});
