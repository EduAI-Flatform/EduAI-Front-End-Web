import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GdsWalletActivity } from './GdsWalletActivity';
import { gdsWalletService, type GdsActivityPage } from '../../services/gds-wallet.service';
import { apiClient } from '../../services/api-client';
import { PlatformProvider, usePlatform } from '../platform/PlatformProvider';
const page = (start: number, nextCursor: string | null): GdsActivityPage => ({
  items: Array.from({ length:20 },(_,i)=>({ id:`journal-${start+i}`,type:'TOPUP_CREDIT',amountMinor:String(10000+start+i),occurredAt:'2026-11-05T01:00:00Z' })),nextCursor,hasMore:!!nextCursor,
});
afterEach(()=>{vi.restoreAllMocks();localStorage.clear();document.documentElement.lang='vi';});
describe('full wallet history',()=>{
  it('updates populated journal and withdrawal system labels live without translating bank details', async () => {
    const journalTypes = ['WITHDRAWAL_RESERVE', 'WITHDRAWAL_RELEASE', 'WITHDRAWAL_PAID', 'REVENUE_CREDIT', 'REVENUE_REVERSAL', 'TOPUP_CREDIT', 'RESERVE', 'CAPTURE', 'RELEASE'] as const;
    vi.spyOn(apiClient, 'get').mockResolvedValue({ settings: {} });
    vi.spyOn(gdsWalletService, 'transactions').mockResolvedValue({ items: [
      ...journalTypes.map((type, index) => ({ id: `journal-${index}`, type, amountMinor: '1234', occurredAt: '2026-11-05T01:00:00Z' })),
      ...(['PENDING', 'PAID', 'CANCELLED'] as const).map(status => ({ id: `withdrawal-${status}`, type: 'WITHDRAWAL' as const, status, amountMinor: '1234', occurredAt: '2026-11-05T01:00:00Z', bankShortName: 'Trạng thái / Authored Bank', accountNumber: '0123456789' })),
    ], nextCursor: null, hasMore: false });
    function Switch() { const { locale, setLocale } = usePlatform(); return <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch language</button>; }
    const { container } = render(<PlatformProvider><Switch /><GdsWalletActivity /></PlatformProvider>);
    await screen.findAllByText('Nạp GDS đã xác minh');
    const labels = ['Hold GDS for withdrawal request', 'Release held GDS', 'Withdraw to bank', 'Teaching revenue credited to GDS', 'Revenue adjustment after refund', 'Verified GDS top-up', 'Hold GDS for order', 'Pay with GDS', 'Return held GDS'];
    await userEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    labels.forEach(label => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
    ['Pending withdrawal', 'Transferred', 'Returned to wallet', 'Pending approval', 'Cancelled'].forEach(label => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
    expect(screen.getAllByText('Trạng thái / Authored Bank · 0123456789')).toHaveLength(3);
    const amount = container.querySelector('.gds-history-amount strong')?.textContent;
    expect(amount).toContain('1,234');
    await userEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByText('Nạp GDS đã xác minh')).toBeInTheDocument();
    expect(screen.getAllByText('Trạng thái / Authored Bank · 0123456789')).toHaveLength(3);
    expect(container.querySelector('.gds-history-amount strong')?.textContent).toContain('1.234');
  });
  it('appends pages beyond20 and sends the selected filter to the server',async()=>{
    const list=vi.spyOn(gdsWalletService,'transactions').mockResolvedValueOnce(page(0,'next')).mockResolvedValueOnce(page(20,null)).mockResolvedValueOnce({items:[],nextCursor:null,hasMore:false});
    render(<GdsWalletActivity />);
    await screen.findByText('+10.000 ₫');
    fireEvent.click(screen.getByRole('button',{name:'Xem thêm giao dịch'}));
    await screen.findByText('+10.039 ₫');
    expect(screen.getAllByRole('listitem')).toHaveLength(40);
    expect(list).toHaveBeenNthCalledWith(2,'all','next');
    fireEvent.click(screen.getByRole('button',{name:'Lọc: Thanh toán'}));
    await screen.findByText('Chưa có giao dịch phù hợp.');
    expect(list).toHaveBeenLastCalledWith('payments',undefined);
    expect(screen.queryByText(/20 hoạt động|Chọn.*Rút tiền/)).not.toBeInTheDocument();
  });
  it('keeps loaded rows on next-page failure and retries same cursor',async()=>{
    const list=vi.spyOn(gdsWalletService,'transactions').mockResolvedValueOnce(page(0,'next')).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(20,null));
    render(<GdsWalletActivity />); await screen.findByText('+10.000 ₫');
    fireEvent.click(screen.getByRole('button',{name:'Xem thêm giao dịch'}));
    await screen.findByRole('alert'); expect(screen.getAllByRole('listitem')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button',{name:'Xem thêm giao dịch'}));
    await screen.findByText('+10.039 ₫'); expect(list).toHaveBeenLastCalledWith('all','next');
  });
  it('ignores late responses after changing the filter',async()=>{
    let resolve!: (p:GdsActivityPage)=>void;
    vi.spyOn(gdsWalletService,'transactions').mockReturnValueOnce(new Promise(r=>{resolve=r;})).mockResolvedValueOnce({items:[],nextCursor:null,hasMore:false});
    render(<GdsWalletActivity />); fireEvent.click(screen.getByRole('button',{name:'Lọc: Tiền ra'}));
    await screen.findByText('Chưa có giao dịch phù hợp.');
    await act(async()=>resolve(page(0,null)));
    expect(screen.queryByText('+10.000 ₫')).not.toBeInTheDocument();
    await waitFor(()=>expect(screen.getByRole('button',{name:'Lọc: Tiền ra'})).toHaveAttribute('aria-pressed','true'));
  });
  it('refreshes after wallet changes and ignores a pending older next page',async()=>{
    let resolve!: (p:GdsActivityPage)=>void;
    vi.spyOn(gdsWalletService,'transactions').mockResolvedValueOnce(page(0,'next'))
      .mockReturnValueOnce(new Promise(r=>{resolve=r;})).mockResolvedValueOnce(page(100,null));
    const view=render(<GdsWalletActivity revision="balance:old"/>);await screen.findByText('+10.000 ₫');
    fireEvent.click(screen.getByRole('button',{name:'Xem thêm giao dịch'}));
    view.rerender(<GdsWalletActivity revision="balance:new"/>);await screen.findByText('+10.100 ₫');
    await act(async()=>resolve(page(20,null)));
    expect(screen.queryByText('+10.020 ₫')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
  });
});
