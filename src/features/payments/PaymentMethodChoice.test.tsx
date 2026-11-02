import {describe,expect,it,vi} from 'vitest';
import {fireEvent,render,renderHook,screen,waitFor} from '@testing-library/react';
import {paymentService} from '../../services/payment.service';
import {PaymentMethodChoice,usePaymentMethodChoice} from './PaymentMethodChoice';
describe('cash wallet availability',()=>{
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
});
