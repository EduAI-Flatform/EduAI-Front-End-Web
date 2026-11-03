import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,renderHook,screen,waitFor} from '@testing-library/react';
import {paymentService} from '../../services/payment.service';
import {gdsWalletService} from '../../services/gds-wallet.service';
import {PaymentMethodChoice,usePaymentMethodChoice} from './PaymentMethodChoice';
describe('cash wallet availability',()=>{
  beforeEach(() => {
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({
      available: false, mode: 'disabled', state: 'UNAVAILABLE', balance: null,
      paymentEnabled: false, topupEnabled: false,
    });
  });
  it('temporarily shows only PayOS and disabled GDS even if backend offers legacy methods',()=>{
    render(<PaymentMethodChoice choice={{methods:['bank_transfer','payos','vnpay'],selected:undefined,setSelected:vi.fn()}}/>);
    expect(screen.getByRole('radio',{name:/Ví GDS/})).toBeDisabled();
    expect(screen.getByRole('radio',{name:/VietQR · PayOS/})).toBeEnabled();
    expect(screen.queryByRole('radio',{name:/VNPay|Quét QR MB|chuyển khoản MB/})).not.toBeInTheDocument();
    expect(screen.getByText(/Chọn phương thức trước khi tạo mã QR/)).toBeVisible();
  });
  it('does not infer an enabled QR provider when the server returns none',()=>{
    render(<PaymentMethodChoice choice={{methods:[],selected:undefined,setSelected:vi.fn()}}/>);
    expect(screen.getByText(/Chưa có phương thức thanh toán khả dụng/)).toBeVisible();
    expect(screen.queryByRole('radio',{name:/Quét QR MB|VNPay|PayOS/})).not.toBeInTheDocument();
    expect(screen.getByRole('radio',{name:/Ví GDS/})).toBeDisabled();
  });
  it('shows an explicit choice even if PayOS is the first available provider',()=>{
    render(<PaymentMethodChoice choice={{methods:['payos','vnpay'],selected:undefined,setSelected:vi.fn()}}/>);
    expect(screen.getByRole('radio',{name:/VietQR · PayOS/})).not.toBeChecked();
  });
  it('requires an actual user gesture to select PayOS',()=>{
    const setSelected=vi.fn();
    render(<PaymentMethodChoice choice={{methods:['payos'],selected:undefined,setSelected}}/>);
    expect(setSelected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio',{name:/VietQR · PayOS/}));
    expect(setSelected).toHaveBeenCalledWith('payos');
  });
  it('filters the backend-enabled list without defaulting to PayOS', async()=>{
    const methods = vi.spyOn(paymentService,'methods').mockResolvedValueOnce(['vnpay','bank_transfer','payos']);
    try {
      const {result} = renderHook(()=>usePaymentMethodChoice());
      await waitFor(()=>expect(result.current.methods).toEqual(['payos']));
      expect(result.current.selected).toBeUndefined();
    } finally { methods.mockRestore(); }
  });
  it('never enables only legacy methods when PayOS is disabled', async()=>{
    const methods = vi.spyOn(paymentService,'methods').mockResolvedValueOnce(['vnpay','bank_transfer']);
    try {
      const {result} = renderHook(()=>usePaymentMethodChoice());
      await waitFor(()=>expect(methods).toHaveBeenCalled());
      expect(result.current.methods).toEqual([]);
      expect(result.current.selected).toBeUndefined();
    } finally { methods.mockRestore(); }
  });
  it('shows and selects GDS only when the wallet API confirms checkout readiness', async()=>{
    vi.stubEnv('VITE_GDS_UAT_CHECKOUT_ENABLED', 'true');
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValueOnce({
      available: true, mode: 'sandbox', state: 'READY_SANDBOX',
      balance: { settledMinor: '150000', reservedMinor: '0', availableMinor: '150000', currency: 'VND' },
      paymentEnabled: true, topupEnabled: false,
    });
    const methods = vi.spyOn(paymentService,'methods').mockResolvedValueOnce(['payos','vnpay']);
    try {
      const {result} = renderHook(()=>usePaymentMethodChoice());
      await waitFor(()=>expect(result.current.methods).toEqual(['payos','gds_wallet']));
      const setSelected = vi.fn();
      render(<PaymentMethodChoice choice={{...result.current, selected:undefined,setSelected}}/>);
      expect(screen.getByRole('radio',{name:/Ví GDS/})).toBeEnabled();
      expect(screen.getByText(/150\.000/)).toBeVisible();
      fireEvent.click(screen.getByRole('radio',{name:/Ví GDS/}));
      expect(setSelected).toHaveBeenCalledWith('gds_wallet');
      expect(screen.queryByRole('radio',{name:/VNPay|Quét QR MB/})).not.toBeInTheDocument();
    } finally { methods.mockRestore(); vi.unstubAllEnvs(); }
  });
});


describe('zero wallet checkout guidance', () => {
  it('shows verified zero balance and a topup link instead of unavailable', async () => {
    vi.spyOn(paymentService, 'methods').mockResolvedValue(['payos']);
    vi.spyOn(gdsWalletService, 'summary').mockResolvedValue({available:true,mode:'production',state:'READY_PRODUCTION',balance:{settledMinor:'0',reservedMinor:'0',availableMinor:'0',currency:'VND'},paymentEnabled:true,topupEnabled:true});
    const {result}=renderHook(()=>usePaymentMethodChoice());
    await waitFor(()=>expect(result.current.gdsAvailableBalance).toBe('0'));
    expect(result.current.methods).toEqual(['payos']);
    render(<PaymentMethodChoice choice={result.current}/>);
    expect(screen.getByRole('radio',{name:/GDS/})).toBeDisabled();
    expect(screen.getByText('S\u1ed1 d\u01b0 0\u0111 \u2014 N\u1ea1p ti\u1ec1n \u0111\u1ec3 thanh to\u00e1n')).toBeVisible();
    expect(screen.getByRole('link',{name:'N\u1ea1p ti\u1ec1n v\u00e0o v\u00ed'})).toHaveAttribute('href','/wallet/gds');
  });
  it('does not block PayOS while wallet summary remains pending',async()=>{
    vi.spyOn(paymentService,'methods').mockResolvedValue(['payos']);
    vi.spyOn(gdsWalletService,'summary').mockReturnValue(new Promise(()=>{}));
    const {result}=renderHook(()=>usePaymentMethodChoice());
    await waitFor(()=>expect(result.current.methods).toEqual(['payos']));
  });
});
