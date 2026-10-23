import {useCallback,useEffect,useRef,useState} from 'react';
import {receiptError,receiptOperationKey,receiptService,receiptStatusLabel,type BankReview,type BankStatementEvidence,type ReceiptAccess,type ReceiptClaim,type ReceiptPage} from '../../../services/receipt.service';
import {PrivateReceiptImage,ReceiptAssessment,ReceiptAccessNotice} from '../../payments/ReceiptPanel';
import {AdminUserConfirmationDialog} from './AdminUserConfirmationDialog';
import '../../payments/receipt-review.css';
import './AdminUserManagementPage.css';

type Action='revoke'|'restore'|'approve';
const actionLabels:Record<Action,string>={revoke:'Thu hồi quyền truy cập',restore:'Khôi phục quyền truy cập',approve:'Xác nhận đã thanh toán'};
const date=(value:string)=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('vi-VN'):'Chưa có';
const money=(value:string,currency='VND')=>/^[0-9]+$/.test(value)?new Intl.NumberFormat('vi-VN',{style:'currency',currency}).format(BigInt(value)):'Chưa có';
function eligibleStatement(evidence:BankStatementEvidence,bank:BankReview){
  const request=bank.request;
  return !evidence.exceptionReason && /^[a-f0-9]{64}$/.test(evidence.statementSha256) && Boolean(evidence.statementReference)
    && evidence.bankBin===request.bankBin && evidence.accountNumber===request.accountNumber && evidence.amountMinor===request.amountMinor
    && evidence.transferContent===request.transferContent && Boolean(evidence.transactionId)
    && Number.isFinite(Date.parse(evidence.occurredAt)) && Date.parse(evidence.occurredAt)<Date.parse(request.expiresAt);
}
export function AdminReceiptReviewPage(){
  const [scope,setScope]=useState<'pending'|'all'>('pending');
  const [page,setPage]=useState(1);const [queue,setQueue]=useState<ReceiptPage|null>(null);const [selected,setSelected]=useState<string>();
  const [detail,setDetail]=useState<ReceiptClaim|null>(null);const [access,setAccess]=useState<ReceiptAccess|null>(null);const [bank,setBank]=useState<BankReview|null>(null);
  const [evidenceId,setEvidenceId]=useState('');const [reason,setReason]=useState('');const [attested,setAttested]=useState(false);
  const [loading,setLoading]=useState(true);const [detailLoading,setDetailLoading]=useState(false);const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');const [feedback,setFeedback]=useState('');const [dialog,setDialog]=useState<Action|null>(null);const [revision,setRevision]=useState(0);
  const dialogTrigger=useRef<HTMLElement|null>(null);const titleRef=useRef<HTMLHeadingElement>(null);
  const queueVersion=useRef(0);const detailVersion=useRef(0);const operation=useRef<{fingerprint:string;key:string}>();
  const load=useCallback(async()=>{const requestVersion=++queueVersion.current;setLoading(true);setError('');
    try{const next=await receiptService.queue(page,scope);if(requestVersion!==queueVersion.current)return;setQueue(next);
      setSelected(current=>next.items.some(item=>item.id===current)?current:next.items[0]?.id);setRevision(value=>value+1);
    }catch(e){if(requestVersion===queueVersion.current)setError(receiptError(e));}finally{if(requestVersion===queueVersion.current)setLoading(false);}
  },[page,scope]);
  useEffect(()=>{void load();return()=>{queueVersion.current++;};},[load]);
  useEffect(()=>{const requestVersion=++detailVersion.current;setDetail(null);setAccess(null);setBank(null);setAttested(false);setReason('');setEvidenceId('');
    if(!selected)return;setDetailLoading(true);
    void receiptService.detail(selected).then(async claim=>{
      const [nextAccess,nextBank]=await Promise.all([receiptService.access(claim.id,true),receiptService.bank(claim.requestId)]);
      if(requestVersion!==detailVersion.current)return;
      setDetail(claim);setAccess(nextAccess);setBank(nextBank);setEvidenceId(nextBank.statements.find(item=>eligibleStatement(item,nextBank))?.id??'');
    }).catch(e=>{if(requestVersion===detailVersion.current)setError(receiptError(e));})
      .finally(()=>{if(requestVersion===detailVersion.current)setDetailLoading(false);});
    return()=>{detailVersion.current++;};
  },[selected,revision]);
  const evidence=bank?.statements.find(item=>item.id===evidenceId);
  const readyReason=reason.trim().length>=8&&reason.length<=300;
  const approvalCount=evidence&&bank?new Set(bank.approvals.filter(item=>item.evidenceId===evidence.id).map(item=>item.actorId)).size:0;
  const canApprove=Boolean(evidence&&bank&&eligibleStatement(evidence,bank)&&bank.request.status==='UNDER_REVIEW'&&Date.parse(bank.request.expiresAt)>Date.now());
  function open(action:Action,trigger:HTMLElement){if(!readyReason||busy)return;if(action==='approve'&&(!canApprove||!attested))return;dialogTrigger.current=trigger;setError('');setDialog(action);}
  async function confirm(){if(!dialog||!detail||!access||!readyReason||busy)return;const action=dialog;
    if(action==='approve'&&(!evidence||!canApprove||!attested))return;
    const fingerprint=JSON.stringify({claimId:detail.id,action,reason:reason.trim(),generation:access.generation,evidenceId:evidence?.id});
    if(operation.current?.fingerprint!==fingerprint)operation.current={fingerprint,key:receiptOperationKey()};
    setBusy(true);setError('');
    try{
      if(action==='approve'){
        const result=await receiptService.approve(evidence!,reason.trim(),operation.current.key);
        setFeedback(result.status==='PAID'?'Máy chủ đã xác nhận thanh toán từ chứng cứ ngân hàng.':'Đã ghi nhận lượt duyệt. Cần hai Admin độc lập; đơn chưa được xác nhận thanh toán.');
      }else{await receiptService.change(detail.id,action,{reason:reason.trim(),expectedGeneration:access.generation},operation.current.key);setFeedback('Đã cập nhật quyền truy cập theo đúng nguồn đơn hàng.');}
      setDialog(null);await load();
    }catch(e){setError(receiptError(e));}finally{setBusy(false);}
  }
  return <section className="receipt-admin" aria-labelledby="admin-receipt-title">
    <header><div><span className="receipt-eyebrow">Quản lý thanh toán QR</span><h2 id="admin-receipt-title" ref={titleRef} tabIndex={-1}>Kiểm tra chứng từ và quyền truy cập</h2>
      <p>Kiểm tra ảnh của người mua và đối chiếu tiền vào ngân hàng theo hai nguồn riêng.</p></div>
      <button disabled={busy||loading} onClick={()=>void load()}>Tải lại danh sách</button></header><label>Hiển thị chứng từ<select value={scope} disabled={busy} onChange={event=>{setScope(event.target.value as "pending"|"all");setPage(1);}}><option value="pending">Đơn chờ kiểm tra / quyền chưa đối soát</option><option value="all">Tất cả chứng từ và lịch sử</option></select></label>
    <p className="receipt-access">Ảnh giao dịch không xác nhận đã nhận tiền. Xác nhận thanh toán vẫn yêu cầu chứng cứ ngân hàng và hai Admin độc lập.</p>
    {feedback?<p role="status">{feedback}</p>:null}{error&&!dialog?<p role="alert" className="receipt-error">{error}</p>:null}
    {loading?<p role="status">Đang tải danh sách…</p>:null}
    <div className="receipt-admin-layout"><aside aria-label="Danh sách đơn cần kiểm tra"><div className="receipt-queue">
      {queue?.items.map(item=><button key={item.id} aria-pressed={selected===item.id} disabled={busy} onClick={()=>{setSelected(item.id);setFeedback('');setError('');}}>
        <strong>{item.order?.orderNumber??item.orderId}</strong><span>{item.order?.buyer.fullName??'Người mua'}</span>
        <span>{item.order?money(item.order.payableAmountMinor,item.order.currency):'Chưa có số tiền'}</span>
        <span>{item.order?.lines.map(line=>line.productType==='membership'?'Hội viên':'Khóa học').join(', ')}</span>
        <span>{receiptStatusLabel[item.status]}</span></button>)}
      {queue?.items.length===0?<p>Chưa có chứng từ cần kiểm tra.</p>:null}</div>
      <div className="receipt-admin-actions"><button disabled={page<=1||busy||loading} onClick={()=>setPage(value=>value-1)}>Trang trước</button>
        <span>Trang {page}/{Math.max(1,queue?.totalPages??1)}</span><button disabled={!queue||page>=queue.totalPages||busy||loading} onClick={()=>setPage(value=>value+1)}>Trang sau</button></div>
    </aside><div className="receipt-review-detail">{detailLoading?<p role="status">Đang tải chi tiết…</p>:null}
      {detail&&access&&bank?<><h3>Chi tiết chứng từ</h3><p>Đơn {detail.order?.orderNumber??detail.orderId}</p>
        <p>{detail.order?.buyer.fullName} · {detail.order?.buyer.email}</p>
        <PrivateReceiptImage claim={detail} admin/><ReceiptAssessment claim={detail} financialVerified={access.state==="VERIFIED_PAID"}/><ReceiptAccessNotice access={access} showLearningLink={false}/>
        <section aria-label="Thông tin đối chiếu ngân hàng"><h3>Đối chiếu tiền vào MB</h3>
          <dl className="receipt-facts">{[['Tài khoản nhận',bank.request.accountNumber],['Người thụ hưởng',bank.request.beneficiaryName],['Số tiền cần nhận',money(bank.request.amountMinor)],['Nội dung cần khớp',bank.request.transferContent]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {bank.statements.length===0?<p>Chưa có chứng cứ tiền vào từ nguồn ngân hàng đã được ghi nhận.</p>:<label>Chứng cứ ngân hàng đã ghi nhận<select value={evidenceId} onChange={event=>{setEvidenceId(event.target.value);setAttested(false);}}>
            <option value="">Chọn chứng cứ ngân hàng</option>{bank.statements.map(item=><option key={item.id} value={item.id}>{item.transactionId} · {date(item.occurredAt)}{item.exceptionReason?' · Cần xử lý ngoại lệ':''}</option>)}</select></label>}
          {evidence?<><dl className="receipt-facts">{[['Mã giao dịch ngân hàng',evidence.transactionId],['Thời gian tiền vào',date(evidence.occurredAt)],['Tham chiếu nguồn',evidence.statementReference],['SHA-256 chứng cứ ngân hàng',evidence.statementSha256]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <p>{approvalCount}/2 Admin đã duyệt độc lập.</p></>:null}
          <p>Không lấy mã giao dịch hoặc dấu vân tay tệp từ ảnh người mua để thay chứng cứ ngân hàng. Chứng cứ cần được ghi nhận qua quy trình ngân hàng được phép.</p>
        </section>
        <section aria-label="Thao tác Admin"><h3>Thao tác kiểm tra</h3><label>Lý do thao tác<textarea minLength={8} maxLength={300} value={reason} disabled={busy} onChange={event=>setReason(event.target.value)}/></label>
          <p>Nhập từ 8 đến 300 ký tự. Mọi thao tác đều được kiểm tra lại tại máy chủ.</p>
          <label><span><input type="checkbox" checked={attested} disabled={!canApprove||busy} onChange={event=>setAttested(event.target.checked)}/> Tôi đã kiểm tra độc lập giao dịch tiền vào từ nguồn ngân hàng đáng tin cậy.</span></label>
          <div className="receipt-admin-actions"><button data-primary disabled={!canApprove||!attested||!readyReason||busy} onClick={event=>open('approve',event.currentTarget)}>Xác nhận đã thanh toán</button>
            {access.state==='ACCESS_UNVERIFIED'?<button disabled={!readyReason||busy} onClick={event=>open('revoke',event.currentTarget)}>Thu hồi quyền truy cập</button>:null}
            {access.state==='REVOKED'?<button disabled={!readyReason||busy} onClick={event=>open('restore',event.currentTarget)}>Khôi phục quyền truy cập</button>:null}</div>
        </section>
        <section><h3>Nhật ký thao tác</h3><ol className="receipt-history">{access.history?.map(event=><li key={event.id}><strong>{({GRANTED:'Cấp quyền trước đối soát',REVOKED:'Thu hồi quyền',RESTORED:'Khôi phục quyền',VERIFIED_PAID:'Chuyển sang quyền đã thanh toán'} as Record<string,string>)[event.action]??event.action}</strong>
          <p>{date(event.createdAt)} · Thế hệ {event.generation.generation} · Người thực hiện {event.actorId}</p><p>{event.reason}</p></li>)}</ol>
          {bank.approvals.map(item=><p key={item.evidenceId+item.actorId}>Duyệt chứng cứ ngân hàng · {date(item.approvedAt)} · {item.actorId}</p>)}
          <a href="/admin/dashboard/audit-logs">Xem nhật ký hệ thống đầy đủ</a></section>
      </>:null}</div></div>
    <AdminUserConfirmationDialog open={dialog!==null} title={dialog?actionLabels[dialog]:''}
      description={dialog==='approve'?`Xác nhận lượt duyệt độc lập cho chứng cứ ngân hàng ${evidence?.transactionId??''}. Thanh toán chỉ hoàn tất khi máy chủ xác nhận đủ kiểm soát. Lý do: ${reason}`:
        `${dialog==='revoke'?'Chỉ thu hồi quyền phát sinh từ đơn này; quyền hợp lệ từ nguồn khác được giữ nguyên.':'Khôi phục theo cửa sổ và hạn mức gốc, không cấp lại phần đã sử dụng.'} Lý do: ${reason}`}
      onCloseAutoFocus={event=>{event.preventDefault();const target=dialogTrigger.current;
        if(target?.isConnected && !(target instanceof HTMLButtonElement && target.disabled))target.focus();else titleRef.current?.focus();}}
      error={error||null} isSubmitting={busy} onCancel={()=>{setDialog(null);setError('');}} onConfirm={()=>void confirm()}/>
  </section>;
}