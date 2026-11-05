import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ReceiptText, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatGdsVnd, gdsWalletService, type GdsActivityFilter, type GdsActivityItem } from '../../services/gds-wallet.service';
import { withdrawalDate, withdrawalLabels } from '../../services/gds-withdrawal.service';
import { buildGdsHistory } from './gds-history';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';
import { withdrawalStatusTones } from './withdrawal-status';
import './GdsTransactionHistory.css';

const filters: [GdsActivityFilter,string][] = [['all','Tất cả'],['incoming','Tiền vào'],['outgoing','Tiền ra'],['payments','Thanh toán'],['withdrawals','Rút tiền']];
function activityRow(item: GdsActivityItem) {
  if (item.type !== 'WITHDRAWAL') return { ...buildGdsHistory([{...item,type:item.type}],[])[0],id:item.id };
  const paid = item.status === 'PAID'; const held = ['PENDING','APPROVED','PROCESSING'].includes(item.status ?? '');
  return { ...item, label:'Rút tiền về ngân hàng', description:`${item.bankShortName ?? item.bankCode ?? ''} · ${item.accountNumber ?? ''}`,
    income:false,amountPrefix:paid?'−':'',amountHint:held?'Đang chờ rút':paid?'Đã chuyển':'Đã hoàn về ví',
    status:item.status?withdrawalLabels[item.status]:undefined,statusTone:item.status?withdrawalStatusTones[item.status]:undefined };
}
export function GdsWalletActivity({ enabled=true, revision=0, busy=false, onSelect, onRefresh }: {
  enabled?:boolean; revision?:number; busy?:boolean; onSelect?:(id:string)=>void; onRefresh?:()=>void;
}) {
  const [filter,setFilter]=useState<GdsActivityFilter>('all');
  const [items,setItems]=useState<GdsActivityItem[]>([]);
  const [cursor,setCursor]=useState<string|null>(null);
  const [hasMore,setHasMore]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const generation=useRef(0); const pending=useRef(false);
  const load=useCallback(async (append=false,next?:string)=>{
    if (!enabled || (append && pending.current)) return;
    const current=append?generation.current:++generation.current;
    pending.current=true; setLoading(true);setError('');
    if(!append){setItems([]);setCursor(null);setHasMore(false);}
    try {
      const result=await gdsWalletService.transactions(filter,next);
      if(current!==generation.current)return;
      if(!Array.isArray(result.items)||typeof result.hasMore!=='boolean'||(result.hasMore && (!result.nextCursor||result.nextCursor===next)))throw new Error('Invalid activity page');
      setItems(previous=>append?[...new Map([...previous,...result.items].map(item=>[item.id,item])).values()]:result.items);
      setCursor(result.nextCursor);setHasMore(result.hasMore);
    }catch{if(current===generation.current)setError(append?'Chưa tải được giao dịch tiếp theo. Vui lòng thử lại.':'Chưa tải được lịch sử giao dịch. Vui lòng thử lại.');}
    finally{if(current===generation.current){pending.current=false;setLoading(false);}}
  },[enabled,filter]);
  useEffect(()=>{ if(enabled)void load();else{setItems([]);setLoading(false);setHasMore(false);setError('');}return()=>{generation.current++;pending.current=false;};},[load,enabled,revision]);
  return <section className="gds-history" aria-labelledby="gds-history-title" aria-busy={loading}>
    <header className="gds-history-heading"><h2 id="gds-history-title">Lịch sử giao dịch</h2><Button type="button" variant="ghost" aria-label="Tải lại lịch sử giao dịch" disabled={!enabled||busy||loading} onClick={()=>{onRefresh?.();void load();}}><RefreshCw size={18} aria-hidden="true"/></Button></header>
    <div className="gds-history-filters" role="group" aria-label="Lọc lịch sử giao dịch">{filters.map(([value,label])=><button key={value} type="button" aria-label={`Lọc: ${label}`} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
    {error?<p className="gds-history-error" role="alert">{error}{!items.length?<Button type="button" variant="outline" onClick={()=>void load()}>Thử lại lịch sử</Button>:null}</p>:null}
    {items.length?<ul className="gds-history-list" aria-label="Các giao dịch GDS">{items.map(item=>{const row=activityRow(item);return <li key={row.id}>
      <span className={`gds-history-icon${row.income?' gds-history-icon--income':''}`}>{row.income?<ArrowDownLeft size={18} aria-hidden="true"/>:<ArrowUpRight size={18} aria-hidden="true"/>}</span>
      <div className="gds-history-content"><strong>{row.label}</strong>{row.description?<p>{row.description}</p>:null}<div className="gds-history-meta"><time dateTime={row.occurredAt}>{withdrawalDate(row.occurredAt)}</time>{row.status?<WithdrawalStatusBadge label={row.status} tone={row.statusTone}/>:null}</div></div>
      <div className={`gds-history-amount${row.income?' gds-history-amount--income':''}`}><strong>{row.amountPrefix}{formatGdsVnd(row.amountMinor)}</strong>{row.amountHint?<small>{row.amountHint}</small>:null}</div>
      {row.withdrawalId&&onSelect?<Button type="button" variant="ghost" className="gds-history-detail" disabled={busy} onClick={()=>onSelect(row.withdrawalId!)}>Chi tiết</Button>:null}
    </li>;})}</ul>:!loading&&!error?<div className="gds-history-state"><ReceiptText size={30} aria-hidden="true"/><p>{!enabled?'Chưa thể tải lịch sử giao dịch.':filter==='all'?'Bạn chưa có giao dịch GDS.':'Chưa có giao dịch phù hợp.'}</p></div>:null}
    {loading?<p className="gds-history-state" role="status">Đang tải giao dịch…</p>:null}
    {items.length>0?<p className="gds-history-footnote" aria-live="polite">Đã hiển thị {items.length} giao dịch</p>:null}
    {hasMore?<div className="gds-history-pagination"><Button type="button" variant="outline" disabled={loading||busy} onClick={()=>void load(true,cursor??undefined)}>Xem thêm giao dịch</Button></div>:null}
  </section>;
}
