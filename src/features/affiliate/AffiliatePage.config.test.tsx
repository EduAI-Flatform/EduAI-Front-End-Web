import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AffiliatePage } from './AffiliatePage';
import { PlatformProvider, usePlatform } from '../platform/PlatformProvider';
import { DEFAULT_PLATFORM_SETTINGS } from '../platform/platform.defaults';
const mocks = vi.hoisted(() => ({ get: vi.fn(), state: vi.fn(), list: vi.fn(), create: vi.fn(), reconcile: vi.fn() }));
vi.mock('../../services/api-client', () => ({ apiClient: { get: mocks.get } }));
vi.mock('../../services/affiliate.service', () => ({ affiliateService: { state: mocks.state, list: mocks.list, createIdentity: mocks.create, reconcile: mocks.reconcile } }));
vi.mock('../auth/auth-store', () => ({ useAuthSession: () => ({ user: { roles: ['student'] } }) }));
vi.mock('./AffiliateWithdrawal', () => ({ AffiliateWithdrawal: () => null }));
function Switch() { const { setLocale } = usePlatform(); return <button onClick={() => setLocale('en')}>switch</button>; }
function show(email = '', url = '') {
 mocks.get.mockResolvedValue({ settings: { ...DEFAULT_PLATFORM_SETTINGS, branding: { ...DEFAULT_PLATFORM_SETTINGS.branding, supportEmail: email, supportUrl: url } } });
 return render(<PlatformProvider><MemoryRouter><Switch /><AffiliatePage /></MemoryRouter></PlatformProvider>);
}
beforeEach(() => {
 localStorage.clear(); mocks.create.mockReset();
 mocks.state.mockResolvedValue({ enabled: false, totalReferrals: 0, identities: [], accruedAmountMinor: '0', availableBalanceMinor: null });
 mocks.list.mockResolvedValue({ items: [], page: 1, totalPages: 0 });
});
describe('configured affiliate support', () => {
 it('shows configured support in both locales while the program remains disabled', async () => {
  show('help@example.test', 'https://support.example.test/referral');
  expect(await screen.findByRole('heading', { name: 'Hỗ trợ referral' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Email hỗ trợ' })).toHaveAttribute('href', 'mailto:help%40example.test');
  expect(screen.getByRole('link', { name: 'Trang hỗ trợ' })).toHaveAttribute('href', 'https://support.example.test/referral');
  expect(screen.getByRole('button', { name: 'Tạo mã referral' })).toBeDisabled();
  act(() => screen.getByRole('button', { name: 'switch' }).click());
  expect(screen.getByRole('heading', { name: 'Referral support' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Support email' })).toHaveAttribute('href', 'mailto:help%40example.test');
  expect(screen.getByRole('link', { name: 'Support page' })).toHaveAttribute('href', 'https://support.example.test/referral');
  expect(screen.getByText('The referral program is not open yet.')).toBeInTheDocument(); expect(mocks.create).not.toHaveBeenCalled();
 });
 it.each([['', ''], ['help@example..test', ''], ['help@-example.test', ''], ['help@example.test?subject=Injected', 'javascript:alert(1)'], ['bad', '//other.example'], ['help%0d%0a@example.test', 'https://user:password@example.test'], ['', '/bad\\path'], ['', 'http://example.test']])('omits empty or unsafe contacts (%s, %s)', async (email, url) => {
  show(email, url); await screen.findByRole('button', { name: 'Tạo mã referral' });
  expect(screen.queryByRole('heading', { name: 'Hỗ trợ referral' })).not.toBeInTheDocument();
 });
 it('allows an existing internal support destination', async () => { show('', '/support'); expect(await screen.findByRole('link', { name: 'Trang hỗ trợ' })).toHaveAttribute('href', '/support'); });
});

it.each(["o'connor@example.test", 'help!vip@example.test', 'help+tag%name?desk@example.test'])('keeps valid special mailbox %s in one encoded mailto address', async email => {
 show(email);
 const href = (await screen.findByRole('link', { name: 'Email hỗ trợ' })).getAttribute('href')!;
 expect(href).toBe('mailto:' + encodeURIComponent(email).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase()));
 expect(decodeURIComponent(href.slice(7))).toBe(email);
 expect(href).not.toContain('?'); expect(href).not.toContain('#');
});

describe('truthful reconciliation notices', () => {
 it.each(['vi', 'en'])('reports unavailable results in %s without claiming commission was updated', async locale => {
  mocks.reconcile.mockResolvedValue({ nextCursor: null, items: [{ id: 'historical', status: 'accrued', walletCreditStatus: 'SYNCED' }, { id: 'unavailable', status: 'unavailable' }] });
  show(); if (locale === 'en') act(() => screen.getByRole('button', { name: 'switch' }).click());
  fireEvent.click(await screen.findByRole('button', { name: locale === 'vi' ? 'Rút tiền' : 'Withdraw' }));
  fireEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Cập nhật hoa hồng' : 'Refresh commission' }));
  expect(await screen.findByText(locale === 'vi' ? /Đối soát chưa hoàn tất/ : /Reconciliation is incomplete/)).toBeInTheDocument();
  expect(screen.queryByText('Commission and wallet balance updated.')).not.toBeInTheDocument();
  if (locale === 'vi') { act(() => screen.getByRole('button', { name: 'switch' }).click()); expect(screen.getByText(/Reconciliation is incomplete/)).toBeInTheDocument(); }
 });
 it('reports invalid wallet policy results as incomplete', async () => {
  mocks.reconcile.mockResolvedValue({ nextCursor: null, items: [{ id: 'invalid', status: 'accrued', walletCreditStatus: 'REFERRAL_POLICY_INVALID' }] });
  show(); act(() => screen.getByRole('button', { name: 'switch' }).click());
  fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' })); fireEvent.click(screen.getByRole('button', { name: 'Refresh commission' }));
  expect(await screen.findByText(/Reconciliation is incomplete/)).toBeInTheDocument();
 });
 it('allows successful historical corrections while new participation remains disabled', async () => {
  mocks.reconcile.mockResolvedValue({ nextCursor: null, items: [{ id: 'negative-correction', status: 'accrued', walletCreditStatus: 'SYNCED' }] });
  show(); act(() => screen.getByRole('button', { name: 'switch' }).click());
  fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' })); fireEvent.click(screen.getByRole('button', { name: 'Refresh commission' }));
  expect(await screen.findByText('Commission and wallet balance updated.')).toBeInTheDocument();
 });
});
