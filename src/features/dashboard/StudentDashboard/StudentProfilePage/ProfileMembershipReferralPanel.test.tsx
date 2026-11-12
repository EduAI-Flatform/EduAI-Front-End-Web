import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileMembershipReferralPanel } from './ProfileMembershipReferralPanel';

const mocks = vi.hoisted(() => ({
  mine: vi.fn(), state: vi.fn(), createIdentity: vi.fn(), reconcile: vi.fn(),
  locale: 'vi' as 'vi' | 'en',
}));
vi.mock('../../../../services/membership-cards.service', () => ({ membershipCardsService: { mine: mocks.mine } }));
vi.mock('../../../../services/affiliate.service', () => ({ affiliateService: { state: mocks.state, createIdentity: mocks.createIdentity, reconcile: mocks.reconcile } }));
vi.mock('../../../platform/PlatformProvider', () => ({ usePlatform: () => ({ locale: mocks.locale, t: (vi: string, en: string) => mocks.locale === 'vi' ? vi : en }) }));

function card() {
  return { policy: { enabled: true }, evaluation: { status: 'evaluated', tier: { code: 'gold', name: { vi: 'Thẻ Hạng Vàng', en: 'Golden Member' } } } };
}
function affiliate() {
  return { enabled: true, identities: [
    { id: 'instructor', kind: 'instructor', status: 'active', referralUrl: 'https://gds.example.test/?ref=instructor' },
    { id: 'disabled', kind: 'general', status: 'disabled', referralUrl: 'https://gds.example.test/?ref=old' },
    { id: 'general', kind: 'general', status: 'active', referralUrl: 'https://gds.example.test/?ref=current' },
  ] };
}
const show = () => render(<MemoryRouter><ProfileMembershipReferralPanel /></MemoryRouter>);

describe('profile membership and referral data', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.locale = 'vi'; mocks.mine.mockResolvedValue(card()); mocks.state.mockResolvedValue(affiliate());
  });

  it('shows only the evaluated current card and existing active general referral using read-only requests', async () => {
    show();
    await screen.findByText('Thẻ Hạng Vàng');
    expect(await screen.findByRole('link', { name: 'Liên kết giới thiệu của tôi' })).toHaveAttribute('href', 'https://gds.example.test/?ref=current');
    expect(screen.queryByText('https://gds.example.test/?ref=old')).not.toBeInTheDocument();
    expect(screen.queryByText('https://gds.example.test/?ref=instructor')).not.toBeInTheDocument();
    expect(mocks.mine).toHaveBeenCalledTimes(1);
    expect(mocks.state).toHaveBeenCalledTimes(1);
    expect(mocks.createIdentity).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it('localizes system labels and the configured tier name in English', async () => {
    mocks.locale = 'en'; show();
    expect(await screen.findByText('Golden Member')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'My referral link' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Membership card' })).toBeInTheDocument();
  });

  it('does not expose stale card or referral data while either policy is disabled', async () => {
    mocks.mine.mockResolvedValue({ ...card(), policy: { enabled: false } });
    mocks.state.mockResolvedValue({ ...affiliate(), enabled: false });
    show();
    await screen.findByText('Chính sách thẻ thành viên chưa được áp dụng.');
    expect(await screen.findByText('Chương trình giới thiệu chưa được mở.')).toBeInTheDocument();
    expect(screen.queryByText('Thẻ Hạng Vàng')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Liên kết giới thiệu của tôi' })).not.toBeInTheDocument();
  });

  it('shows an available referral independently of card failure and retries only the failed section', async () => {
    mocks.mine.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(card());
    show();
    const membership = screen.getByRole('region', { name: 'Thẻ thành viên' });
    expect(await within(membership).findByRole('alert')).toHaveTextContent('Không tải được thông tin thẻ.');
    expect(await screen.findByRole('link', { name: 'Liên kết giới thiệu của tôi' })).toBeInTheDocument();
    fireEvent.click(within(membership).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Thẻ Hạng Vàng')).toBeInTheDocument();
    expect(mocks.mine).toHaveBeenCalledTimes(2);
    expect(mocks.state).toHaveBeenCalledTimes(1);
  });

  it('does not invent a tier or URL when evaluation or link availability is incomplete', async () => {
    mocks.mine.mockResolvedValue({ policy: { enabled: true }, evaluation: { status: 'unavailable', tier: card().evaluation.tier } });
    mocks.state.mockResolvedValue({ enabled: true, identities: [{ kind: 'general', status: 'active', code: 'code-only', referralUrl: null }] });
    show();
    await screen.findByText('Chưa thể xác định hạng thẻ của bạn.');
    expect(await screen.findByText('Bạn chưa có liên kết giới thiệu đang hoạt động.')).toBeInTheDocument();
    expect(screen.queryByText('Thẻ Hạng Vàng')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Liên kết giới thiệu của tôi' })).not.toBeInTheDocument();
  });

  it('keeps the evaluated card visible if referral loading fails and rejects unsafe returned URLs', async () => {
    mocks.state.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ enabled: true, identities: [{ kind: 'general', status: 'active', referralUrl: 'javascript:alert(1)' }] });
    show();
    expect(await screen.findByText('Thẻ Hạng Vàng')).toBeInTheDocument();
    const referral = screen.getByRole('region', { name: 'Giới thiệu bạn bè' });
    await within(referral).findByRole('alert');
    fireEvent.click(within(referral).getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(mocks.state).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Bạn chưa có liên kết giới thiệu đang hoạt động.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Liên kết giới thiệu của tôi' })).not.toBeInTheDocument();
    expect(mocks.mine).toHaveBeenCalledTimes(1);
  });
});
