import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReceiptPanel } from './ReceiptPanel';
import { receiptService } from '../../services/receipt.service';
vi.mock('../../services/receipt.service',async importOriginal=>({...(await importOriginal<typeof import('../../services/receipt.service')>()),
  receiptService:{list:vi.fn(),upload:vi.fn(),access:vi.fn(),image:vi.fn()}}));
const claim={id:'claim',orderId:'order',requestId:'request',status:'MATCHED_CLAIM',financialProof:false,fields:{amountMinor:'1000',transferContent:'EDUTEST'},
  warnings:['CUSTOMER_IMAGE_NOT_BANK_PROOF'],confidence:95,createdAt:new Date().toISOString(),assessedAt:new Date().toISOString(),expiresAt:'2030-01-01',imageAvailable:false};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(receiptService.list).mockResolvedValue({items:[]});vi.mocked(receiptService.access).mockResolvedValue({state:'ACCESS_UNVERIFIED',generation:1,source:'UNVERIFIED_RECEIPT_ACCESS',financialProof:false,accessEnabled:true});});
describe('receipt customer UI',()=>{
  it('shows OCR below evidence and full access without claiming payment',async()=>{
    vi.mocked(receiptService.upload).mockResolvedValue(claim as never);
    render(<ReceiptPanel orderId="order" orderNumber="EDUTEST" uploadAllowed />);
    await screen.findByText('Chưa có ảnh giao dịch.');
    fireEvent.change(screen.getByLabelText('Chọn ảnh giao dịch'),{target:{files:[new File(['png'],'receipt.png',{type:'image/png'})]}});
    fireEvent.click(screen.getByRole('button',{name:'Tải ảnh lên'}));
    await screen.findByText('Ảnh khớp thông tin đơn');
    await screen.findByText('Đã mở đầy đủ quyền học — đang chờ đối soát');
    expect(screen.getByText('EDUTEST',{selector:'dd'})).toBeInTheDocument();
    expect(screen.queryByText('Đã thanh toán')).not.toBeInTheDocument();
  });
  it('validates local format and size before sending',async()=>{
    render(<ReceiptPanel orderId="order" orderNumber="EDUTEST" uploadAllowed />);
    await screen.findByText('Chưa có ảnh giao dịch.');
    fireEvent.change(screen.getByLabelText('Chọn ảnh giao dịch'),{target:{files:[new File(['bad'],'receipt.svg',{type:'image/svg+xml'})]}});
    expect(screen.getByRole('alert')).toHaveTextContent('PNG hoặc JPEG');expect(receiptService.upload).not.toHaveBeenCalled();
  });
  it('restores submitted receipts after refresh and shows precise revocation',async()=>{
    vi.mocked(receiptService.list).mockResolvedValue({items:[claim as never]});
    vi.mocked(receiptService.access).mockResolvedValue({state:'REVOKED',generation:1,source:'UNVERIFIED_RECEIPT_ACCESS',financialProof:false,accessEnabled:false});
    render(<ReceiptPanel orderId="order" orderNumber="EDUTEST" uploadAllowed={false} />);
    await screen.findByText('Quyền từ đơn này đã được thu hồi. Quyền mua hợp lệ từ nguồn khác được giữ nguyên.');
    expect(screen.queryByRole('button',{name:'Tải ảnh lên'})).not.toBeInTheDocument();
    await waitFor(()=>expect(receiptService.list).toHaveBeenCalledWith('order'));
  });
  it('reports an unavailable access status instead of silently hiding it',async()=>{
    vi.mocked(receiptService.list).mockResolvedValue({items:[claim as never]});vi.mocked(receiptService.access).mockRejectedValue(new Error('unavailable'));
    render(<ReceiptPanel orderId="order" orderNumber="EDUTEST" uploadAllowed={false}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được trạng thái quyền');
  });});