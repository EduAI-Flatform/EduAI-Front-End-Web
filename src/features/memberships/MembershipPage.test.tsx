import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipCatalogItem, MembershipCurrentState } from '../../services/membership.service';
import { MembershipPage } from './MembershipPage';
import { paymentService } from '../../services/payment.service';
import { gdsWalletService } from '../../services/gds-wallet.service';

const membershipApi = vi.hoisted(() => ({
  catalog: vi.fn(),
  current: vi.fn(),
  checkout: vi.fn(),
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()), useNavigate: () => navigate,
}));

vi.mock('../../services/membership.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/membership.service')>()),
  membershipService: membershipApi,
}));

vi.mock('../../services/payment.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/payment.service')>()),
  paymentService: {
    create: vi.fn(),
    methods: vi.fn(),
    status: vi.fn(),
  },
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
    removedCourses: [{
      id: 'removed-course', title: 'Dữ liệu ứng dụng', slug: 'du-lieu-ung-dung',
      startedBeforeRemoval: true, graceDays: 14,
      graceStartsAt: '2028-08-01T00:00:00.000Z', graceEndsAt: '2028-08-15T00:00:00.000Z',
    }],
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
    removedCourses: [],
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
  expiringGraceCourses: [],
};

describe('MembershipPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentService.methods).mockResolvedValue(['payos', 'vnpay']);
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
    await userEvent.click(await screen.findByRole('button', { name: 'Gia hạn gói' }));

    expect(await screen.findByRole('heading', { name: 'EduAI Gold' })).toBeInTheDocument();
    expect(screen.getByText(/AI Coach: 30 lượt/)).toBeInTheDocument();
    expect(screen.getByText('AI an toàn')).toBeInTheDocument();
    expect(screen.getByText(/2\.400\.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/1\.800\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, element) => element?.tagName === 'P' && /1\/8\/2028/.test(element.textContent ?? '')).length).toBeGreaterThan(0);
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
      expiringGraceCourses: [{
        courseId: 'grace-course', title: 'Học máy nâng cao', slug: 'hoc-may-nang-cao',
        graceEndsAt: '2028-08-05T00:00:00.000Z',
      }],
    } satisfies MembershipCurrentState);

    render(<MembershipPage />);

    expect(await screen.findByText(/đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && /hạ cấp đang chờ: EduAI Basic/i.test(element.textContent ?? ''))).toBeInTheDocument();
    expect(screen.getByText(/EDU-M-PENDING/)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && /Học máy nâng cao/i.test(element.textContent ?? ''))).toHaveTextContent(/5\/8\/2028/);
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
      removedCourses: [],
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
    }, expect.any(String)));
    expect(paymentService.create).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/orders/order-id');
  });

  it('leaves payment selection and financial operations to the order page', async () => {
    const payWallet = vi.spyOn(gdsWalletService, 'payOrder');
    render(<MembershipPage />);
    await screen.findByRole('heading', { name: 'EduAI Basic' });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(paymentService.methods).not.toHaveBeenCalled();
    expect(paymentService.create).not.toHaveBeenCalled();
    expect(payWallet).not.toHaveBeenCalled();
    expect(membershipApi.checkout).not.toHaveBeenCalled();
  });

  it('reuses the checkout idempotency key after an uncertain order creation failure without paying', async () => {
    const user = userEvent.setup();
    membershipApi.checkout.mockRejectedValueOnce(new Error('Order response lost'))
      .mockResolvedValueOnce({ order: { id: 'recovered-order' } });
    render(<MembershipPage />);
    const card = (await screen.findByRole('heading', { name: 'EduAI Gold' })).closest('article')!;
    if (card.querySelector('button')?.textContent === 'Gia hạn gói') await user.click(card.querySelector('button')!);
    if (card.querySelector('input[type="checkbox"]')) await user.click(card.querySelector('input[type="checkbox"]')!);
    await user.click(card.querySelector('button')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Order response lost');
    await user.click(card.querySelector('button')!);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/orders/recovered-order'));
    expect(membershipApi.checkout).toHaveBeenCalledTimes(2);
    expect(membershipApi.checkout.mock.calls[1]).toEqual(membershipApi.checkout.mock.calls[0]);
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('prevents repeated order creation while the first checkout is pending', async () => {
    const user = userEvent.setup();
    membershipApi.checkout.mockReturnValue(new Promise(() => undefined));
    render(<MembershipPage />);
    const card = (await screen.findByRole('heading', { name: 'EduAI Gold' })).closest('article')!;
    if (card.querySelector('button')?.textContent === 'Gia hạn gói') await user.click(card.querySelector('button')!);
    if (card.querySelector('input[type="checkbox"]')) await user.click(card.querySelector('input[type="checkbox"]')!);
    const button = card.querySelector('button')!;
    await user.dblClick(button);
    expect(membershipApi.checkout).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('resumes an existing pending order instead of opening another checkout', async () => {
    const user = userEvent.setup();
    membershipApi.current.mockResolvedValue({ ...currentState, pendingChange: {
      action: 'RENEW', startsAt: '2028-08-01', endsAt: '2029-08-01', activatesImmediately: false,
      plan: { id: 'gold-plan', code: 'GOLD', versionId: 'gold-version', displayName: 'EduAI Gold' },
      order: { id: 'pending-order', orderNumber: 'EDU-PENDING-RENEW', status: 'PENDING_PAYMENT' },
    } });
    render(<MembershipPage />);
    const card = (await screen.findByRole('heading', { name: 'EduAI Gold' })).closest('article')!;
    if (card.querySelector('button')?.textContent === 'Gia hạn gói') await user.click(card.querySelector('button')!);
    if (card.querySelector('input[type="checkbox"]')) await user.click(card.querySelector('input[type="checkbox"]')!);
    await user.click(card.querySelector('button')!);
    expect(navigate).toHaveBeenCalledWith('/orders/pending-order');
    expect(membershipApi.checkout).not.toHaveBeenCalled();
    expect(paymentService.create).not.toHaveBeenCalled();
  });

  it('discloses removed courses, bounded grace, and history preservation before confirmation', async () => {
    render(<MembershipPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Gia hạn gói' }));

    const card = (await screen.findByRole('heading', { name: 'EduAI Gold' })).closest('article')!;
    expect(card).toHaveTextContent('Thay đổi khi gia hạn sang phiên bản mới nhất');
    expect(card).toHaveTextContent('Dữ liệu ứng dụng');
    expect(card).toHaveTextContent(/15\/8\/2028/);
    expect(card).toHaveTextContent('Tiến độ và chứng chỉ đã đạt được không bị xóa');
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
  it('offers the existing purchase order after refresh rather than creating another order',async()=>{
    membershipApi.current.mockResolvedValue({...currentState,pendingChange:{action:'PURCHASE',startsAt:'2026-10-01',endsAt:'2026-11-01',activatesImmediately:true,
      plan:{id:'gold-plan',code:'GOLD',versionId:'gold-version',displayName:'EduAI Gold'},order:{id:'existing-order',orderNumber:'EDU-PENDING',status:'PENDING_PAYMENT'}}});
    render(<MembershipPage/>);
    expect(await screen.findByRole('link',{name:'Tiếp tục kiểm tra đơn EDU-PENDING'})).toHaveAttribute('href','/orders/existing-order');
    expect(membershipApi.checkout).not.toHaveBeenCalled();
  });});
 it('does not offer a second purchase of the active plan without explicit renewal',async()=>{
  membershipApi.current.mockResolvedValue(currentState);
  render(<MembershipPage />);const card=(await screen.findByRole('heading',{name:'EduAI Gold'})).closest('article')!;
  expect(card).toHaveTextContent('Gói đang sử dụng');
  expect(card.querySelector('input[type="checkbox"]')).toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Gia hạn gói'}));
  expect(membershipApi.checkout).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Tạo đơn gia hạn'})).toBeDisabled();
 });


it('shows missing benefits explicitly and previews a renewal after current expiry',async()=>{
 membershipApi.current.mockResolvedValue(currentState);membershipApi.catalog.mockResolvedValue({items:catalog});
 render(<MembershipPage />);
 await userEvent.click(await screen.findByRole('button',{name:'Gia hạn gói'}));
 expect(screen.getByRole('region',{name:'Quyền lợi EduAI Basic'})).toHaveTextContent('Không có khóa học đi kèm');
 expect(screen.getByRole('region',{name:'Quyền lợi EduAI Gold'})).toHaveTextContent('AI Coach: 30');
 const card=screen.getByRole('heading',{name:'EduAI Gold'}).closest('article')!;
 expect(card).toHaveTextContent(/1\/8\/2028/);expect(card).toHaveTextContent(/1\/8\/2029/);
 expect(membershipApi.checkout).not.toHaveBeenCalled();
});
