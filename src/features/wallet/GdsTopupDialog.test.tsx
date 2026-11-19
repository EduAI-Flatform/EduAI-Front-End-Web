import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GdsTopupDialog } from './GdsTopupDialog';
import { PlatformProvider, usePlatform } from '../platform/PlatformProvider';
import { apiClient } from '../../services/api-client';
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.documentElement.lang = 'vi'; });
function LocaleSwitch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>; }
const qr = { topupId: '11111111-1111-4111-8111-111111111111', amountMinor: '10000', currency: 'VND' as const, transferMemo: 'G0AB12CD3', receivingAccount: 'VIRTUAL-TEST', checkoutUrl: 'https://pay.payos.vn/web/test', qrCodeDataUrl: 'data:image/png;base64,AAAA', expiresAt: new Date(Date.now()+900000).toISOString(), status: 'AWAITING_TRANSFER' as const, gdsCredited: false as const };
describe('GDS cancellation dialog', () => {
  it('links successful topups to membership cards in both languages without advertising retired plans', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ settings: {} });
    render(<PlatformProvider><LocaleSwitch /><MemoryRouter><GdsTopupDialog open onOpenChange={vi.fn()} qr={qr} result={{ topupId: qr.topupId, amountMinor: qr.amountMinor, currency: 'VND', status: 'CREDITED', gdsCredited: true, creditedAt: '2030-01-01' }} creating={false} error={null} onCancel={vi.fn()} cancelling={false} cancelError={null} /></MemoryRouter></PlatformProvider>);
    for (const locale of ['vi', 'en', 'vi']) {
      if (locale === 'en' || document.documentElement.lang === 'en') fireEvent.click(screen.getByRole('button', { name: 'Switch', hidden: true }));
      expect(screen.getByRole('link', { name: locale === 'vi' ? 'Thẻ thành viên' : 'Membership cards' })).toHaveAttribute('href', '/membership-cards');
      expect(screen.queryByRole('link', { name: locale === 'vi' ? 'Gói thành viên' : 'Membership plans' })).not.toBeInTheDocument();
    }
  });
  it('requires explicit confirmation before requesting cancellation', () => {
    const onCancel=vi.fn();
    render(<MemoryRouter><GdsTopupDialog open onOpenChange={vi.fn()} qr={qr} result={null} creating={false} error={null} onCancel={onCancel} cancelling={false} cancelError={null} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Hủy yêu cầu'}));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Xác nhận hủy'}));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img')).toBeVisible();
  });
  it.each(['RECONCILING','REVIEW','CREDITED','CANCELLED','EXPIRED'] as const)('does not offer cancellation for %s', status => {
    render(<MemoryRouter><GdsTopupDialog open onOpenChange={vi.fn()} qr={qr} result={{topupId:qr.topupId,amountMinor:qr.amountMinor,currency:'VND',status,gdsCredited:status==='CREDITED',creditedAt:null}} creating={false} error={null} onCancel={vi.fn()} cancelling={false} cancelError={null} /></MemoryRouter>);
    expect(screen.queryByRole('button',{name:'Hủy yêu cầu'})).not.toBeInTheDocument();
  });
});
