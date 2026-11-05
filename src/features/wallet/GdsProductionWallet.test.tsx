import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GdsWalletPage } from './GdsWalletPage';
import { usePaymentMethodChoice } from '../payments/PaymentMethodChoice';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { paymentService } from '../../services/payment.service';
import { tmiService } from '../../services/tmi.service';
const production = { available:true, mode:'production', state:'READY_PRODUCTION',
  balance:{settledMinor:'150000',reservedMinor:'0',availableMinor:'150000',currency:'VND'},
  paymentEnabled:true, topupEnabled:true, recentTransactions:[{id:'entry-1',type:'TOPUP_CREDIT',amountMinor:'150000',occurredAt:'2026-11-03T10:00:00.000Z'}] } as unknown as GdsWalletSummary;
beforeEach(() => {
  vi.stubEnv('VITE_GDS_UAT_CHECKOUT_ENABLED','false');
  vi.spyOn(gdsWalletService,'summary').mockResolvedValue(production);
  vi.spyOn(paymentService,'methods').mockResolvedValue(['payos']);
  vi.spyOn(tmiService,'wallet').mockResolvedValue({current:0,earned:0,spent:0,expired:0});
});
afterEach(() => {vi.restoreAllMocks();vi.unstubAllEnvs();});
describe('production wallet server capabilities', () => {
  it('enables production checkout without a frontend UAT flag and never selects it implicitly',async()=>{
    const {result}=renderHook(()=>usePaymentMethodChoice());
    await waitFor(()=>expect(result.current.methods).toEqual(['payos','gds_wallet']));
    expect(result.current.selected).toBeUndefined();
    expect(result.current.gdsAvailableBalance).toBe('150000');
  });
  it.each([
    {...production,paymentEnabled:false},
    {...production,mode:'sandbox'},
    {...production,state:'READY_SANDBOX'},
    {...production,available:false},
  ])('fails closed on disabled or inconsistent wallet readiness %#', async wallet=>{
    vi.mocked(gdsWalletService.summary).mockResolvedValue(wallet as GdsWalletSummary);
    const {result}=renderHook(()=>usePaymentMethodChoice());
    await waitFor(()=>expect(gdsWalletService.summary).toHaveBeenCalled());
    await waitFor(()=>expect(result.current.methods).toEqual(['payos']));
  });
  it('keeps PayOS available if the wallet API fails',async()=>{
    vi.mocked(gdsWalletService.summary).mockRejectedValue(new Error('temporarily unavailable'));
    const {result}=renderHook(()=>usePaymentMethodChoice());
    await waitFor(()=>expect(result.current.methods).toEqual(['payos']));
    expect(result.current.gdsAvailableBalance).toBeNull();
  });
  it('shows production balance and history with new transactions paused',async()=>{
    vi.mocked(gdsWalletService.summary).mockResolvedValue({...production,topupEnabled:false,paymentEnabled:false});
    const {container}=render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
    await waitFor(()=>expect(container.querySelector('.gds-wallet-page__balance-value')?.textContent).toContain('150.000'));
    expect(screen.getByRole('list', { name: 'Các giao dịch GDS' }).children).toHaveLength(1);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Nạp tiền'})).toBeDisabled();
    expect(container.querySelector('.gds-wallet-page__balance-card')?.textContent).not.toMatch(/ki.m th/);
  });
  it('does not create a QR before capability loading finishes',()=>{
    vi.mocked(gdsWalletService.summary).mockReturnValue(new Promise(()=>{}));
    render(<MemoryRouter><GdsWalletPage /></MemoryRouter>);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Nạp tiền'})).toBeDisabled();
  });
});
