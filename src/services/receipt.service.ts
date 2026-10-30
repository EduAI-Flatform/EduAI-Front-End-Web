import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';

export interface ReceiptAccess {
  state: 'NONE' | 'ACCESS_UNVERIFIED' | 'REVOKED' | 'VERIFIED_PAID';
  generation: number; source: 'UNVERIFIED_RECEIPT_ACCESS'; financialProof: false; accessEnabled?: boolean;
  history?: Array<{id:string;action:string;actorId:string;reason:string;createdAt:string;generation:{generation:number}}>;
}
export interface ReceiptClaim {
  id:string;orderId:string;requestId:string;status:'PROCESSING'|'MATCHED_CLAIM'|'REVIEW_REQUIRED'|'OCR_FAILED';
  financialProof:false;fields:Record<string,string|null>|null;warnings:string[];confidence:number|null;
  createdAt:string;assessedAt:string|null;expiresAt:string;imageAvailable:boolean;access?:ReceiptAccess;
  order?: {id:string;orderNumber:string;status:string;payableAmountMinor:string;currency:string;
    buyer:{id:string;fullName:string;email:string};lines:Array<{productType:string;displayTitle:string}>}|null;
}
export interface ReceiptPage { items:ReceiptClaim[];page:number;pageSize:number;total:number;totalPages:number }
export interface BankStatementEvidence {
  id:string;recordedById:string;exceptionReason:string|null;bankBin:string;accountNumber:string;transactionId:string;amountMinor:string;transferContent:string;
  occurredAt:string;statementReference:string;statementSha256:string;recordedAt:string;
}
export interface BankReview {
  request:{id:string;status:string;bankBin:string;accountNumber:string;beneficiaryName:string;amountMinor:string;transferContent:string;expiresAt:string};
  statements:BankStatementEvidence[];approvals:Array<{evidenceId:string;actorId:string;approvedAt:string}>;
  support:Array<{id:string;reason:string;createdAt:string}>;
}
const client=new ApiClient({getAccessToken:()=>getAuthSession()?.accessToken});
const id=(value:string)=>encodeURIComponent(value);
export const receiptOperationKey=()=>globalThis.crypto.randomUUID();
export const receiptService={
  list:(orderId:string)=>client.get<{items:ReceiptClaim[]}>(`/payments/orders/${id(orderId)}/receipts`,{cache:'no-store'}),
  upload:(orderId:string,file:File,key:string)=>{const form=new FormData();form.append('image',file);return client.post<ReceiptClaim>(`/payments/orders/${id(orderId)}/receipts`,form,{headers:{'Idempotency-Key':key}});},
  access:(claimId:string,admin=false)=>client.get<ReceiptAccess>(admin?`/admin/commerce/receipt-claims/${id(claimId)}/access`:`/payments/receipts/${id(claimId)}/access`,{cache:'no-store'}),
  image:(claimId:string,admin=false,signal?:AbortSignal)=>client.getBlob(admin?`/admin/commerce/receipt-claims/${id(claimId)}/image`:`/payments/receipts/${id(claimId)}/image`,{signal}),
  queue:(page=1,scope:'pending'|'all'='pending')=>client.get<ReceiptPage>(`/admin/commerce/receipt-claims?page=${page}&pageSize=20&scope=${scope}`,{cache:'no-store'}),
  detail:(claimId:string)=>client.get<ReceiptClaim>(`/admin/commerce/receipt-claims/${id(claimId)}`,{cache:'no-store'}),
  bank:(requestId:string)=>client.get<BankReview>(`/admin/commerce/bank-transfers/${id(requestId)}`,{cache:'no-store'}),
  change:(claimId:string,action:'revoke'|'restore',input:{reason:string;expectedGeneration:number},key:string)=>
    client.post<ReceiptAccess>(`/admin/commerce/receipt-claims/${id(claimId)}/${action}`,input,{headers:{'Idempotency-Key':key}}),
  approve:(evidence:BankStatementEvidence,reason:string,key:string)=>client.post<{status:string}>(`/admin/commerce/bank-transfers/evidence/${id(evidence.id)}/approvals`,{
    source:'BANK_STATEMENT_CHECKED',reason,statementSha256:evidence.statementSha256,transactionId:evidence.transactionId,
    amountMinor:evidence.amountMinor,accountNumber:evidence.accountNumber,transferContent:evidence.transferContent,
  },{headers:{'Idempotency-Key':key}}),
};
export const receiptStatusLabel:Record<ReceiptClaim['status'],string>={PROCESSING:'Đang kiểm tra ảnh',MATCHED_CLAIM:'Ảnh khớp thông tin đơn',REVIEW_REQUIRED:'Cần Admin kiểm tra',OCR_FAILED:'Chưa đọc được ảnh'};
export function receiptError(error:unknown):string {
  const messages:Record<string,string>={RECEIPT_ALREADY_USED:'Ảnh này đã được sử dụng. Vui lòng kiểm tra đúng đơn hàng.',
    RECEIPT_UPLOAD_LIMIT:'Đơn hàng đã đạt giới hạn 3 ảnh. Vui lòng liên hệ hỗ trợ.',RECEIPT_IMAGE_TYPE_INVALID:'Chỉ nhận ảnh PNG hoặc JPEG.',
    RECEIPT_IMAGE_TOO_LARGE:'Ảnh vượt quá dung lượng cho phép.',ORDER_NOT_PAYABLE:'Đơn không còn nhận ảnh mới. Bạn vẫn có thể xem kết quả đã gửi.',
    RECEIPT_ACCESS_STATE_CHANGED:'Quyền đã thay đổi. Vui lòng tải lại trước khi thao tác.',ORDER_ALREADY_VERIFIED:'Đơn đã được xác minh thanh toán; không thể thu hồi quyền qua ảnh.',
    RECEIPT_OPERATOR_REQUIRED:'Tài khoản chưa có quyền kiểm tra chứng từ này.',BANK_RECEIPT_DISABLED:'Chức năng kiểm tra ảnh chưa được bật trong môi trường này.',
    RECEIPT_CONCURRENT_OPERATION:'Có thao tác đồng thời. Vui lòng thử lại với cùng ảnh.',HTTP_413:'Ảnh vượt quá 5 MB.'};
  // The API may wrap a business identifier in message and append a correlation id.
  const messageCode=error instanceof ApiClientError ? error.message.match(/^([A-Z][A-Z0-9_]*)(?:$| \()/)?.[1] : undefined;
  return error instanceof ApiClientError ? (messages[error.code]??(messageCode?messages[messageCode]:undefined)??'Chưa thể hoàn tất. Vui lòng tải lại trạng thái và thử lại.') : 'Chưa thể kết nối. Vui lòng kiểm tra mạng và thử lại.';
}
export const receiptWarningLabel:Record<string,string>={CUSTOMER_IMAGE_NOT_BANK_PROOF:'Ảnh do người mua cung cấp; chưa chứng minh tiền đã vào ngân hàng.',
  TRANSACTION_REUSED:'Mã giao dịch đã được dùng trong chứng từ khác; cần kiểm tra trùng lặp.',OCR_REVIEW_REQUIRED:'Kết quả đọc ảnh cần được kiểm tra thêm.',PROCESSING_LEASE_EXPIRED:'Quá thời gian đọc ảnh; vui lòng tải lại kết quả.',BANK_MISMATCH:'Ngân hàng chưa khớp',ACCOUNT_MISMATCH:'Tài khoản nhận chưa khớp',BENEFICIARY_MISMATCH:'Người nhận chưa khớp',AMOUNT_MISMATCH:'Số tiền chưa khớp',CONTENT_MISMATCH:'Nội dung chuyển khoản chưa khớp',TIME_MISMATCH:'Thời gian chưa phù hợp',TRANSACTION_ID_MISSING:'Ảnh chưa có mã giao dịch',TRANSACTION_ID_INVALID:'Mã giao dịch chưa hợp lệ',
  TRANSACTION_ALREADY_CLAIMED:'Mã giao dịch đã xuất hiện ở đơn khác',OCR_LOW_CONFIDENCE:'Ảnh chưa đủ rõ để đọc chính xác',OCR_UNAVAILABLE:'Chưa thể đọc ảnh tự động',PRIVATE_STORAGE_UNAVAILABLE:'Chưa lưu được ảnh riêng tư',ORDER_WINDOW_CLOSED:'Đơn đã hết thời hạn nhận chứng từ',PROCESSING_INTERRUPTED:'Quá trình đọc ảnh bị gián đoạn',BUYER_NO_LONGER_ELIGIBLE:'Tài khoản cần được kiểm tra lại'};