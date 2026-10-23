import {describe,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {PaymentMethodChoice} from './PaymentMethodChoice';
describe('cash wallet availability',()=>{
  it('offers server-enabled QR and preserves providers while keeping GDS unavailable',()=>{
    render(<PaymentMethodChoice choice={{methods:['bank_transfer','payos','vnpay'],selected:'bank_transfer',setSelected:vi.fn()}}/>);
    expect(screen.getByRole('option',{name:'Quét QR — chuyển khoản MB'})).toBeEnabled();
    expect(screen.getByRole('option',{name:'Ví GDS — ví tiền chưa khả dụng'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'VietQR · PayOS'})).toBeEnabled();expect(screen.getByRole('option',{name:'VNPay'})).toBeEnabled();
    expect(screen.getByText('Ví GDS là ví tiền. Điểm TMI không dùng để thanh toán tại đây.')).toBeVisible();
  });
  it('does not infer an enabled QR provider when the server returns none',()=>{
    render(<PaymentMethodChoice choice={{methods:[],selected:undefined,setSelected:vi.fn()}}/>);
    expect(screen.getByRole('option',{name:'Quét QR MB — chưa khả dụng'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'Ví GDS — ví tiền chưa khả dụng'})).toBeDisabled();
  });
});