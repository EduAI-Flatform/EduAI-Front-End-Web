import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipCatalogItem, MembershipCurrentState } from '../../services/membership.service';
import { MembershipPage } from './MembershipPage';

const membershipApi = vi.hoisted(() => ({
  catalog: vi.fn(),
  current: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock('../../services/membership.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/membership.service')>()),
  membershipService: membershipApi,
}));

const catalog: MembershipCatalogItem[] = [
  {
    id: 'gold-version',
    plan: { id: 'gold-plan', code: 'GOLD' },
    displayName: 'EduAI Gold',
    description: 'Học chuyên sâu với quyền lợi nâng cao.',
    currency: 'VND',
    durations: [{
      id: 'gold-annual',
      months: 12,
      basePriceAmountMinor: '2400000',
      discountPercent: 25,
      finalPriceAmountMinor: '1800000',
    }],
    services: [{ code: 'AI_COACH', displayName: 'AI Coach', valueType: 'METERED', booleanValue: null, quota: '30', unitLabel: 'lượt' }],
    includedCourses: [{ id: 'course-id', title: 'AI an toàn', slug: 'ai-an-toan', graceDays: 7 }],
  },
  {
    id: 'basic-version',
    plan: { id: 'basic-plan', code: 'BASIC' },
    displayName: 'EduAI Basic',
    description: null,
    currency: 'VND',
    durations: [{ id: 'basic-monthly', months: 1, basePriceAmountMinor: '100000', discountPercent: 0, finalPriceAmountMinor: '100000' }],
    services: [],
    includedCourses: [],
  },
];

const currentState: MembershipCurrentState = {
  membership: {
    id: 'subscription-id',
    plan: { id: 'gold-plan', code: 'GOLD' },
    versionId: 'gold-version',
    displayName: 'EduAI Gold',
    startsAt: '2027-08-01T00:00:00.000Z',
    expiresAt: '2028-08-01T00:00:00.000Z',
    status: 'ACTIVE',
  },
  pendingChange: null,
};

describe('MembershipPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipApi.catalog.mockResolvedValue({ items: catalog });
    membershipApi.current.mockResolvedValue(currentState);
  });

  it('shows a meaningful loading state while live membership APIs are pending', () => {
    membershipApi.catalog.mockReturnValue(new Promise(() => undefined));
    membershipApi.current.mockReturnValue(new Promise(() => undefined));

    render(<MembershipPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải gói thành viên/i);
  });

  it('compares live benefits, quotas, included courses, and server prices', async () => {
    render(<MembershipPage />);

    expect(await screen.findByRole('heading', { name: 'EduAI Gold' })).toBeInTheDocument();
    expect(screen.getByText(/AI Coach: 30 lượt/)).toBeInTheDocument();
    expect(screen.getByText('AI an toàn')).toBeInTheDocument();
    expect(screen.getByText(/2\.400\.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/1\.800\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText((_, element) => element?.tagName === 'P' && /hết hạn 1\/8\/2028/i.test(element.textContent ?? ''))).toBeInTheDocument();
  });

  it('shows an expired membership and a pending downgrade explicitly', async () => {
    membershipApi.current.mockResolvedValue({
      membership: { ...currentState.membership!, status: 'EXPIRED' },
      pendingChange: {
        action: 'DOWNGRADE',
        startsAt: '2028-08-01T00:00:00.000Z',
        endsAt: '2028-09-01T00:00:00.000Z',
        activatesImmediately: false,
        plan: { id: 'basic-plan', code: 'BASIC', versionId: 'basic-version', displayName: 'EduAI Basic' },
        order: { id: 'order-id', orderNumber: 'EDU-M-PENDING', status: 'PENDING_PAYMENT' },
      },
    } satisfies MembershipCurrentState);

    render(<MembershipPage />);

    expect(await screen.findByText(/đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && /hạ cấp đang chờ: EduAI Basic/i.test(element.textContent ?? ''))).toBeInTheDocument();
    expect(screen.getByText(/EDU-M-PENDING/)).toBeInTheDocument();
  });

  it('requires an explicit change kind and benefit confirmation before checkout', async () => {
    const user = userEvent.setup();
    membershipApi.checkout.mockResolvedValue({
      order: { id: 'order-id', orderNumber: 'EDU-M-1', status: 'PENDING_PAYMENT', payable: { amountMinor: '100000', currency: 'VND' } },
      action: 'DOWNGRADE',
      plan: { id: 'basic-plan', code: 'BASIC', versionId: 'basic-version', displayName: 'EduAI Basic' },
      durationMonths: 1,
      startsAt: '2028-08-01T00:00:00.000Z',
      endsAt: '2028-09-01T00:00:00.000Z',
      activatesImmediately: false,
      paymentRequired: true,
    });
    render(<MembershipPage />);

    const card = (await screen.findByRole('heading', { name: 'EduAI Basic' })).closest('article')!;
    const checkoutButton = card.querySelector('button')!;
    expect(checkoutButton).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Loại thay đổi cho EduAI Basic'), 'DOWNGRADE');
    expect(checkoutButton).toBeDisabled();
    await user.click(screen.getByLabelText('Xác nhận quyền lợi EduAI Basic'));
    expect(checkoutButton).toBeEnabled();
    await user.click(checkoutButton);

    await waitFor(() => expect(membershipApi.checkout).toHaveBeenCalledWith({
      versionId: 'basic-version',
      durationOptionId: 'basic-monthly',
      requestedChange: 'DOWNGRADE',
      changedBenefitsConfirmed: true,
    }));
    expect(await screen.findByRole('heading', { name: /Đơn gói thành viên đã được tạo/i })).toBeInTheDocument();
  });

  it('renders useful empty and API error states', async () => {
    membershipApi.catalog.mockResolvedValueOnce({ items: [] });
    const { rerender } = render(<MembershipPage />);
    expect(await screen.findByRole('heading', { name: /Chưa có gói thành viên/i })).toBeInTheDocument();

    membershipApi.catalog.mockRejectedValueOnce(new Error('Catalog unavailable'));
    membershipApi.current.mockRejectedValueOnce(new Error('Catalog unavailable'));
    rerender(<MembershipPage key="error" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog unavailable');
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });
});
