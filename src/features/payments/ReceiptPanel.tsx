import { useCallback, useEffect, useRef, useState } from 'react';
import { receiptError, receiptOperationKey, receiptService, receiptStatusLabel, receiptWarningLabel,
  type ReceiptAccess, type ReceiptClaim } from '../../services/receipt.service';
import './receipt-review.css';

export function PrivateReceiptImage({claim,admin=false}:{claim:ReceiptClaim;admin?:boolean}) {
  const [url,setUrl]=useState<string>();const [failed,setFailed]=useState(false);
  useEffect(()=>{
    setUrl(undefined);setFailed(false);if(!claim.imageAvailable)return;
    const abort=new AbortController();let objectUrl:string|undefined;
    void Promise.resolve().then(()=>abort.signal.aborted?null:receiptService.image(claim.id,admin,abort.signal)).then(blob=>{
      if(!blob||abort.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
    }).catch(()=>{if(!abort.signal.aborted)setFailed(true);});
    return()=>{abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[claim.id,claim.imageAvailable,admin]);
  return <figure className="receipt-image">{url?<img src={url} alt="Ảnh giao dịch do người mua cung cấp" />:
    <p>{!claim.imageAvailable?'Ảnh không còn khả dụng theo thời hạn lưu trữ.':failed?'Chưa tải được ảnh riêng tư. Vui lòng tải lại.':'Đang tải ảnh riêng tư…'}</p>}
    <figcaption>Chứng từ do người mua cung cấp</figcaption></figure>;
}
const fieldLabels:Record<string,string>={bankBin:'Ngân hàng (BIN)',accountNumber:'Tài khoản nhận',beneficiaryName:'Người nhận',
  amountMinor:'Số tiền',transferContent:'Nội dung chuyển khoản',occurredAt:'Thời gian',transactionId:'Mã giao dịch'};
export function ReceiptAssessment({claim,financialVerified=false}:{claim:ReceiptClaim;financialVerified?:boolean}) {
  return <section className="receipt-assessment" aria-label="Kết quả kiểm tra ảnh">
    <h4>{receiptStatusLabel[claim.status]}</h4>
    <p>Trạng thái tài chính: <strong>{financialVerified?"Đã xác minh từ ngân hàng":"Chờ đối soát"}</strong></p>
    {claim.fields?<dl className="receipt-facts">{Object.entries(fieldLabels).map(([field,label])=><div key={field}>
      <dt>{label}</dt><dd>{claim.fields?.[field]||'Chưa đọc được'}</dd></div>)}</dl>:<p>Chưa có đủ thông tin để đối chiếu.</p>}
    {claim.confidence!==null?<p>Độ tin cậy OCR: {claim.confidence}%</p>:null}
    <ul className="receipt-warnings">{claim.warnings.map(warning=><li key={warning}>{receiptWarningLabel[warning]??'Thông tin ảnh cần được Admin kiểm tra thêm.'}</li>)}</ul>
  </section>;
}
export function ReceiptAccessNotice({access,showLearningLink=true}:{access:ReceiptAccess|null;showLearningLink?:boolean}) {
  if(!access)return null;
  if(access.state==='NONE')return <p role="status">Chưa cấp quyền tự động. Vui lòng chờ Admin kiểm tra.</p>;
  return <div className="receipt-access" role="status">{access.state==='ACCESS_UNVERIFIED'?
    <><strong>{access.accessEnabled?'Đã mở đầy đủ quyền học — đang chờ đối soát':'Quyền đang chờ kiểm tra trong môi trường này'}</strong>
    <p>Ảnh chưa xác nhận tiền đã vào ngân hàng. Admin có thể thu hồi quyền phát sinh từ đơn nếu thông tin không phù hợp.</p>
    {access.accessEnabled&&showLearningLink?<a href="/dashboard/learning">Vào khu vực học tập</a>:null}</>:
    access.state==='REVOKED'?<p>Quyền từ đơn này đã được thu hồi. Quyền mua hợp lệ từ nguồn khác được giữ nguyên.</p>:
    <strong>Đơn đã được xác minh thanh toán qua nguồn ngân hàng.</strong>}</div>;
}

export function ReceiptPanel({orderId,orderNumber,uploadAllowed}:{orderId:string;orderNumber:string;uploadAllowed:boolean}) {
  const [claims,setClaims]=useState<ReceiptClaim[]>([]);const [selected,setSelected]=useState<string>();
  const [access,setAccess]=useState<ReceiptAccess|null>(null);const [file,setFile]=useState<File|null>(null);
  const [refreshRevision,setRefreshRevision]=useState(0);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const operation=useRef<string>('');const version=useRef(0);
  const load=useCallback(async()=>{
    const requestVersion=++version.current;
    try {const result=await receiptService.list(orderId);if(requestVersion!==version.current)return;
      setClaims(result.items);setRefreshRevision(value=>value+1);setSelected(current=>result.items.some(item=>item.id===current)?current:result.items[0]?.id);
    }catch(reason){if(requestVersion===version.current)setError(receiptError(reason));}
    finally{if(requestVersion===version.current)setLoading(false);}
  },[orderId]);
  useEffect(()=>{setClaims([]);setSelected(undefined);setAccess(null);setFile(null);setError('');setLoading(true);void load();return()=>{version.current++;};},[load]);
  const claim=claims.find(item=>item.id===selected);
  useEffect(()=>{let active=true;setAccess(null);if(claim)void receiptService.access(claim.id).then(result=>{if(active)setAccess(result);}).catch(()=>{if(active)setError('Chưa tải được trạng thái quyền. Vui lòng tải lại kết quả.');});
    return()=>{active=false;};},[claim?.id,claim?.status,refreshRevision]);
  const processingKey=claims.filter(item=>item.status==='PROCESSING').map(item=>item.id).join(',');
  useEffect(()=>{if(!processingKey)return;let attempts=0;
    const timer=window.setInterval(()=>{if(attempts++>=18){window.clearInterval(timer);setError('Chưa có kết quả mới. Vui lòng tải lại kết quả sau.');return;}void load();},5000);
    return()=>window.clearInterval(timer);},[processingKey,load]);
  function choose(next:File|undefined) {
    setError('');setFile(null);if(!next)return;
    if(!['image/png','image/jpeg'].includes(next.type)){setError('Chỉ nhận ảnh PNG hoặc JPEG.');return;}
    if(next.size>5*1024*1024 || next.size===0){setError('Ảnh phải có dung lượng lớn hơn 0 và không quá 5 MB.');return;}
    setFile(next);operation.current=receiptOperationKey();
  }
  async function upload(){if(!file||busy||!uploadAllowed)return;setBusy(true);setError('');
    const currentVersion=version.current;
    try{const result=await receiptService.upload(orderId,file,operation.current);if(currentVersion!==version.current)return;
      setClaims(previous=>[result,...previous.filter(item=>item.id!==result.id)]);setSelected(result.id);setFile(null);
    }catch(reason){if(currentVersion===version.current)setError(receiptError(reason));}finally{setBusy(false);}}
  return <section className="receipt-panel" aria-labelledby="receipt-panel-title" aria-busy={busy||loading}>
    <header><div><span className="receipt-eyebrow">Bước tiếp theo</span><h3 id="receipt-panel-title">Kiểm tra ảnh giao dịch</h3><p>Đơn {orderNumber}</p></div>
      <button type="button" disabled={busy||loading} onClick={()=>void load()}>Tải lại kết quả</button></header>
    <p>Ảnh giao dịch chỉ là bằng chứng bạn cung cấp. Admin kiểm tra tiền vào ngân hàng trước khi xác nhận đã thanh toán.</p>
    {loading?<p role="status">Đang tải chứng từ…</p>:claims.length===0?<p>Chưa có ảnh giao dịch.</p>:null}
    {claims.length>1?<label>Chứng từ đã gửi<select value={selected??''} onChange={event=>setSelected(event.target.value)}>
      {claims.map((item,index)=><option value={item.id} key={item.id}>Ảnh {claims.length-index} — {receiptStatusLabel[item.status]}</option>)}</select></label>:null}
    {claim?<><PrivateReceiptImage claim={claim}/><ReceiptAssessment claim={claim} financialVerified={access?.state==="VERIFIED_PAID"}/><ReceiptAccessNotice access={access}/></>:null}
    {uploadAllowed && claims.length<3?<form className="receipt-upload" onSubmit={event=>{event.preventDefault();void upload();}}>
      <label>Chọn ảnh giao dịch<input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={event=>choose(event.target.files?.[0])}/></label>
      <p>PNG hoặc JPEG, tối đa 5 MB. Mỗi đơn nhận tối đa 3 ảnh.</p>{file?<p>Đã chọn: {file.name}</p>:null}
      <button type="submit" disabled={!file||busy}>{busy?'Đang tải và kiểm tra ảnh…':'Tải ảnh lên'}</button>
    </form>:<p>{claims.length>=3?'Đã gửi đủ 3 ảnh. Vui lòng liên hệ hỗ trợ nếu cần bổ sung.':'Đơn hiện không nhận ảnh mới.'}</p>}
    {error?<p role="alert" className="receipt-error">{error}</p>:null}
  </section>;
}