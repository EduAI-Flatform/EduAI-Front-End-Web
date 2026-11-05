import { useEffect, useId, useRef, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import type { GdsBank } from '../../services/gds-withdrawal.service';
import './BankPicker.css';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, '');
export function filterBanks(banks: GdsBank[], query: string) {
  const key = normalize(query);
  return banks.map((bank, index) => ({ bank, index, names: [bank.shortName, bank.name, bank.code].map(normalize) }))
    .filter(item => item.names.some(name => name.includes(key)))
    .sort((a, b) => Number(b.names.some(name => name.startsWith(key))) - Number(a.names.some(name => name.startsWith(key))) || a.index - b.index).map(item => item.bank);
}
export function BankLogo({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [code]);
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
  return <span className="bank-logo">{failed || !/^[A-Za-z0-9_-]{2,32}$/.test(code) ? <Building2 aria-hidden="true" size={22} /> : <img src={`${apiBase}/wallet/gds/banks/${encodeURIComponent(code)}/logo`} alt="" onError={() => setFailed(true)} />}</span>;
}
export function BankPicker({ banks, value, onChange, disabled = false, verificationRequired = false }: { banks: GdsBank[]; value: string; onChange: (code: string) => void; disabled?: boolean; verificationRequired?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const selected = banks.find(bank => bank.code === value);
  const results = filterBanks(banks, query);
  const select = (bank: GdsBank) => { if (verificationRequired && !bank.verificationSupported) return; onChange(bank.code); setQuery(''); setOpen(false); setActive(-1); input.current?.focus(); };
  useEffect(() => { if (open && active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' }); }, [active, open, id]);
  return <div className="bank-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); setActive(-1); } }}>
    <label htmlFor={id}>Ngân hàng</label>
    <div className="bank-picker-control">
      {selected && !open ? <BankLogo code={selected.code} /> : null}
      <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        autoComplete="off" disabled={disabled} placeholder="Tìm tên hoặc mã ngân hàng" value={open ? query : selected?.shortName ?? ''}
        onFocus={() => { if (!disabled) { setOpen(true); setQuery(''); } }}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); if (value) onChange(''); }}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(''); setActive(-1); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => event.key === 'ArrowDown' ? Math.min(index + 1, results.length - 1) : Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (results[active]) select(results[active]); }
          if (event.key === 'Tab') { setOpen(false); setQuery(''); setActive(-1); }
        }} />
      <button type="button" aria-label="Mở danh sách ngân hàng" disabled={disabled} tabIndex={-1} onClick={() => { setOpen(current => !current); setQuery(''); if (!open) input.current?.focus(); }}><ChevronDown size={18} aria-hidden="true" /></button>
    </div>
    {open ? <div className="bank-picker-menu"><p className="bank-picker-count" role="status">{results.length} ngân hàng phù hợp</p>
      <ul id={`${id}-list`} role="listbox" aria-label="Danh sách ngân hàng">{results.map((bank, index) => <li id={`${id}-${index}`} key={bank.code} role="option" aria-selected={bank.code === value} aria-disabled={verificationRequired && !bank.verificationSupported} className={active === index ? 'bank-picker-active' : ''}
        onMouseDown={event => event.preventDefault()} onClick={() => select(bank)}>
        <BankLogo code={bank.code} /><span><strong>{bank.shortName}</strong><small>{bank.name}</small>{verificationRequired && !bank.verificationSupported ? <small>{bank.verificationUnavailableReason ?? 'Chưa hỗ trợ xác minh tài khoản'}</small> : null}</span>
      </li>)}</ul>{!results.length ? <p className="bank-picker-empty">Không tìm thấy ngân hàng phù hợp. Thử tên hoặc mã khác.</p> : null}
    </div> : null}
  </div>;
}
