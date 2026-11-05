import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GdsWalletActivity } from './GdsWalletActivity';
import { gdsWalletService, type GdsActivityPage } from '../../services/gds-wallet.service';
const page = (start: number, nextCursor: string | null): GdsActivityPage => ({
  items: Array.from({ length:20 },(_,i)=>({ id:`journal-${start+i}`,type:'TOPUP_CREDIT',amountMinor:String(10000+start+i),occurredAt:'2026-11-05T01:00:00Z' })),nextCursor,hasMore:!!nextCursor,
});
afterEach(()=>vi.restoreAllMocks());
describe('full wallet history',()=>{
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
