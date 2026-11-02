import {describe,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {PaymentMethodChoice} from './PaymentMethodChoice';
describe('cash wallet availability',()=>{
  it('offers server-enabled QR and preserves providers while keeping GDS unavailable',()=>{
    render(<PaymentMethodChoice choice={{methods:['bank_transfer','payos','vnpay'],selected:'bank_transfer',setSelected:vi.fn()}}/>);
    expect(screen.getByRole('option',{name:'Quét QR — chuyển khoản MB'})).toBeEnabled();
    expect(screen.getByRole('option',{name:'Ví GDS — ví tiền chưa khả dụng'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'VietQR · PayOS'})).toBeEnabled();expect(screen.getByRole('option',{name:'VNPay'})).toBeEnabled();
    expect(screen.getByText(/Hãy chọn phương thức trước khi tạo mã QR/)).toBeVisible();
  });
  it('does not infer an enabled QR provider when the server returns none',()=>{
    render(<PaymentMethodChoice choice={{methods:[],selected:undefined,setSelected:vi.fn()}}/>);
    expect(screen.getByRole('option',{name:'Chưa có phương thức khả dụng'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'Quét QR MB — chưa khả dụng'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'Ví GDS — ví tiền chưa khả dụng'})).toBeDisabled();
  });
  it('shows an explicit choice even if PayOS is the first available provider',()=>{
    render(<PaymentMethodChoice choice={{methods:['payos','vnpay'],selected:undefined,setSelected:vi.fn()}}/>);
    expect(screen.getByRole('combobox',{name:'Phương thức thanh toán'})).toHaveValue('');
    expect(screen.getByRole('option',{name:'Chọn phương thức thanh toán'})).toBeDisabled();
  });
});
