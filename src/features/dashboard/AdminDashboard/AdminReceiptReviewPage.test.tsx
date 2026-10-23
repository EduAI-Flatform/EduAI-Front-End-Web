import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,within} from '@testing-library/react';
import {AdminReceiptReviewPage} from './AdminReceiptReviewPage';
import {receiptService} from '../../../services/receipt.service';
vi.mock('../../../services/receipt.service',async importOriginal=>({...(await importOriginal<typeof import('../../../services/receipt.service')>()),
  receiptService:{queue:vi.fn(),detail:vi.fn(),access:vi.fn(),bank:vi.fn(),image:vi.fn(),change:vi.fn(),approve:vi.fn()}}));
const claim={id:'claim',orderId:'order',requestId:'request',status:'MATCHED_CLAIM',financialProof:false,fields:{amountMinor:'1000'},warnings:[],confidence:95,imageAvailable:false,
  order:{id:'order',orderNumber:'EDU-SYNTHETIC',status:'pending_payment',payableAmountMinor:'1000',currency:'VND',buyer:{id:'buyer',fullName:'Người thử nghiệm',email:'buyer@example.test'},lines:[{productType:'membership',displayTitle:'Hội viên thử nghiệm'}]}};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(receiptService.queue).mockResolvedValue({items:[claim],page:1,pageSize:20,total:1,totalPages:1} as never);
  vi.mocked(receiptService.detail).mockResolvedValue(claim as never);vi.mocked(receiptService.access).mockResolvedValue({state:'ACCESS_UNVERIFIED',generation:1,financialProof:false,source:'UNVERIFIED_RECEIPT_ACCESS',accessEnabled:true,history:[]});
  vi.mocked(receiptService.bank).mockResolvedValue({request:{id:'request',status:'UNDER_REVIEW',bankBin:'970422',accountNumber:'0000000000',amountMinor:'1000',transferContent:'EDUTEST',expiresAt:'2099-01-01'},statements:[],approvals:[],support:[]} as never);
});
describe('Admin receipt review',()=>{
  it('retains Admin review and never allows buyer image alone to confirm payment',async()=>{
    render(<AdminReceiptReviewPage/>);await screen.findByRole('heading',{name:'Chi tiết chứng từ'});
    expect(screen.getByRole('button',{name:'Xác nhận đã thanh toán'})).toBeDisabled();
    expect(screen.getByText('Chưa có chứng cứ tiền vào từ nguồn ngân hàng đã được ghi nhận.')).toBeVisible();
    expect(receiptService.approve).not.toHaveBeenCalled();
  });
  it('requires reason and explicit confirmation before exact-source revocation',async()=>{
    vi.mocked(receiptService.change).mockResolvedValue({state:'REVOKED',generation:1,source:'UNVERIFIED_RECEIPT_ACCESS',financialProof:false});
    render(<AdminReceiptReviewPage/>);await screen.findByRole('heading',{name:'Chi tiết chứng từ'});
    const revoke=screen.getByRole('button',{name:'Thu hồi quyền truy cập'});expect(revoke).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lý do thao tác'),{target:{value:'Đã kiểm tra thông tin không khớp'}});fireEvent.click(revoke);
    const dialog=await screen.findByRole('dialog');expect(receiptService.change).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button',{name:'Xác nhận thay đổi'}));
    await screen.findByText('Đã cập nhật quyền truy cập theo đúng nguồn đơn hàng.');
    expect(receiptService.change).toHaveBeenCalledWith('claim','revoke',{reason:'Đã kiểm tra thông tin không khớp',expectedGeneration:1},expect.any(String));
  });
});