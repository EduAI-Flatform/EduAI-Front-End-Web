import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GdsWithdrawalPanel } from './GdsWithdrawalPanel';
import { gdsWithdrawalService, type Withdrawal } from '../../services/gds-withdrawal.service';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';
const request: Withdrawal = { id:'request-1', amountMinor:'10000', status:'PENDING', bankCode:'MB', accountNumber:'123456789', accountHolder:'NGUYEN VAN A', createdAt:'2026-11-05T01:00:00Z', updatedAt:'2026-11-05T01:00:00Z', currency:'VND', processingAdminId:null, transferredAt:null, bankTransactionRef:null };
afterEach(()=>vi.restoreAllMocks());
describe('unified history withdrawal actions',()=>{
  it('opens and cancels a pending withdrawal after changing filters and reloads the feed',async()=>{
    vi.spyOn(gdsWithdrawalService,'settings').mockResolvedValue({minimumMinor:'10000',maximumMinor:'10000000',version:1,admissionEnabled:true,processingEnabled:true});
    vi.spyOn(gdsWithdrawalService,'detail').mockResolvedValue(request);
    const cancel=vi.spyOn(gdsWithdrawalService,'cancel').mockResolvedValue({...request,status:'CANCELLED'});
    const list=vi.spyOn(gdsWalletService,'transactions').mockImplementation(async filter=>({items:filter==='incoming'?[]:[{id:'withdrawal-request-1',type:'WITHDRAWAL',withdrawalId:request.id,amountMinor:'10000',occurredAt:request.createdAt,status:'PENDING',bankCode:'MB',accountNumber:'••••6789'}],hasMore:false,nextCursor:null}));
    const summary: GdsWalletSummary={available:true,mode:'production',state:'READY_PRODUCTION',balance:{settledMinor:'100000',availableMinor:'90000',reservedMinor:'10000',currency:'VND'},paymentEnabled:true,topupEnabled:true,withdrawalEnabled:true};
    render(<GdsWithdrawalPanel summary={summary} onChanged={vi.fn()}/>);
    await screen.findByText(/MB ·/);
    fireEvent.click(screen.getByRole('button',{name:'Lọc: Tiền vào'}));await screen.findByText('Chưa có giao dịch phù hợp.');
    fireEvent.click(screen.getByRole('button',{name:'Lọc: Rút tiền'}));await screen.findByText(/MB ·/);
    fireEvent.click(screen.getByRole('button',{name:'Chi tiết'}));
    fireEvent.change(await screen.findByLabelText('Lý do hủy'),{target:{value:'Không còn nhu cầu'}});
    fireEvent.click(screen.getByRole('button',{name:'Hủy yêu cầu rút tiền'}));
    await waitFor(()=>expect(cancel).toHaveBeenCalledWith(request.id,'Không còn nhu cầu'));
    await waitFor(()=>expect(list.mock.calls.filter(([filter])=>filter==='withdrawals').length).toBeGreaterThan(1));
    expect(screen.queryByRole('heading',{name:'Lịch sử rút tiền'})).not.toBeInTheDocument();
  });
});
