import { SystemValue } from '@/features/platform/SystemText';
import { useSystemMessages, SystemText } from "../platform/SystemText";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { GdsWalletOverview } from './GdsWalletOverview';
import { Button } from '../../components/ui/button';
import {
  formatGdsVnd,
  hasTrustedGdsBalance,
  gdsWalletService,
  getGdsWalletError,
  getGdsPayosQrError,
  type GdsPayosTopupQr,
  type GdsActiveTopup,
  type GdsWalletSummary,
} from '../../services/gds-wallet.service';
import { tmiService } from '../../services/tmi.service';
import './GdsWalletPage.css';
import { GdsTopupDialog } from './GdsTopupDialog';
import { GdsWithdrawalPanel } from './GdsWithdrawalPanel';
import { GdsWalletActivity } from './GdsWalletActivity';

export function GdsWalletPage() {
  const messageForUi = useSystemMessages();
  const translateUI = useSystemMessages();

  const [summary, setSummary] = useState<GdsWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [tmiPoints, setTmiPoints] = useState<number | null>(null);
  const [tmiLoading, setTmiLoading] = useState(true);
  const [payosQr, setPayosQr] = useState<GdsPayosTopupQr | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [creatingQr, setCreatingQr] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const requestKeyRef = useRef<{ amount: string; key: string } | null>(null);
  const amountRef = useRef(amountText);
  const activeTopupRef = useRef<GdsPayosTopupQr | null>(null);
  const refreshGeneration = useRef(0);
  const [topupResult, setTopupResult] = useState<GdsActiveTopup | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [topupEntryOpen, setTopupEntryOpen] = useState(false);

  const refresh = useCallback(async (isMounted: () => boolean = () => true, silent = false, topupId?: string) => {
    const generation = refreshGeneration.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await gdsWalletService.summary(topupId);
      if (isMounted() && generation === refreshGeneration.current &&
          (!topupId || activeTopupRef.current?.topupId === topupId)) {
        setLoading(false);
        setError(null);
        setSummary(next);
        const current = activeTopupRef.current;
        const status = next.activeTopup;
        if (current && status?.topupId === current.topupId && status.amountMinor === current.amountMinor &&
            status.currency === 'VND') {
          const credited = status.status === 'CREDITED' && status.gdsCredited === true &&
            typeof status.creditedAt === 'string' && Number.isFinite(Date.parse(status.creditedAt));
          if (credited || (status.gdsCredited === false && ['REVIEW','RECONCILING','EXPIRED','CANCELLED'].includes(status.status))) {
            setTopupResult(status);
            setCancelError(null);
            if (credited) {
              activeTopupRef.current = null;
              refreshGeneration.current += 1;
              requestKeyRef.current = null;
              setPayosQr(null);
              setQrError(null);
            }
          }
        }
      }
    } catch (cause) {
      if (isMounted() && !silent && generation === refreshGeneration.current) {
        setSummary(null);
        setError(getGdsWalletError(cause));
      }
    } finally {
      if (isMounted() && !silent && generation === refreshGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void refresh(() => mounted);
    return () => { mounted = false; };
  }, [refresh]);

  // Once a QR is displayed, follow the signed-PayOS → reconciliation →
  // ledger projection. Refresh silently: a network hiccup cannot replace a
  // previously verified balance with a fabricated zero or a loading flash.
  useEffect(() => {
    if (!payosQr) return;
    let mounted = true;
    const interval = setInterval(() => {
      void refresh(() => mounted, true, payosQr.topupId);
    }, 3_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [payosQr, refresh]);

  useEffect(() => {
    let mounted = true;
    void tmiService.wallet().then((wallet) => {
      if (mounted) setTmiPoints(Number.isSafeInteger(wallet.current) && wallet.current >= 0 ? wallet.current : null);
    }).catch(() => {
      if (mounted) setTmiPoints(null);
    }).finally(() => {
      if (mounted) setTmiLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const updateAmount = (value: string) => {
    if (cancelling) return;
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 9);
    if (cleaned === amountRef.current) return;
    amountRef.current = cleaned;
    activeTopupRef.current = null;
    setTopupResult(null);
    setCancelError(null);
    setAmountText(cleaned);
    setPayosQr(null);
    setQrError(null);
    requestKeyRef.current = null;
  };

  const hasTrustedBalance = !loading && !error && hasTrustedGdsBalance(summary);
  const canCreateTopup = !loading && !error && summary?.topupEnabled === true &&
    ((summary.mode === 'production' && ['READY_PRODUCTION', 'NOT_INITIALIZED'].includes(summary.state)) ||
      (summary.mode === 'sandbox' && ['READY_SANDBOX', 'NOT_INITIALIZED'].includes(summary.state)));
  const currentBalance = hasTrustedBalance ? formatGdsVnd(summary.balance?.availableMinor) : '—';

  const isAmountValid = /^[1-9]\d{0,8}$/.test(amountText) &&
    Number(amountText) >= 2_000 && Number(amountText) <= 10_000_000;
  const amountPreview = isAmountValid ? formatGdsVnd(amountText) : '—';

  const createQr = async () => {
    if (!canCreateTopup || creatingQr || payosQr || !isAmountValid) return;
    const requestedAmount = amountText;
    setCancelError(null);
    setTopupResult(null);
    setTopupEntryOpen(false);
    setPaymentDialogOpen(true);
    setQrError(null);
    setPayosQr(null);
    setCreatingQr(true);
    try {
      if (!requestKeyRef.current || requestKeyRef.current.amount !== amountText) {
        requestKeyRef.current = { amount: amountText, key: globalThis.crypto.randomUUID() };
      }
      const qr = await gdsWalletService.createPayosQr(requestedAmount, requestKeyRef.current.key);
      if (amountRef.current !== requestedAmount) return;
      if (qr.amountMinor !== requestedAmount || qr.currency !== 'VND' || qr.gdsCredited !== false ||
          !/^G[A-Z0-9]{8}$/.test(qr.transferMemo) || typeof qr.receivingAccount !== 'string' ||
          !/^[A-Za-z0-9_-]{1,128}$/.test(qr.receivingAccount) ||
          !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qr.qrCodeDataUrl) ||
          !/^https:\/\/(pay\.payos\.vn|next\.pay\.payos\.vn)\//.test(qr.checkoutUrl)) {
        throw new Error('Untrusted PayOS QR response');
      }
      refreshGeneration.current += 1;
      activeTopupRef.current = qr;
      setPayosQr(qr);
      void refresh(() => true, true, qr.topupId);
    } catch (cause) {
      if (amountRef.current === requestedAmount) setQrError(getGdsPayosQrError(cause));
    } finally {
      setCreatingQr(false);
    }
  };

  const cancelTopup = async () => {
    const current = activeTopupRef.current;
    if (!current || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const cancelled = await gdsWalletService.cancelPayosTopup(current.topupId);
      if (activeTopupRef.current?.topupId !== current.topupId) return;
      if (cancelled.topupId !== current.topupId || cancelled.status !== 'CANCELLED' || cancelled.gdsCredited !== false) {
        throw new Error('Untrusted cancellation response');
      }
      refreshGeneration.current += 1;
      activeTopupRef.current = null;
      requestKeyRef.current = null;
      setPayosQr(null);
      setTopupResult({ topupId: current.topupId, amountMinor: current.amountMinor, currency: 'VND', status: 'CANCELLED', gdsCredited: false, creditedAt: null });
    } catch {
      if (activeTopupRef.current?.topupId === current.topupId) {
        setCancelError('Chưa thể hủy yêu cầu. Vui lòng thử lại sau; không chuyển thêm tiền.');
        void refresh(() => true, true, current.topupId);
      }
    } finally {
      setCancelling(false);
    }
  };

  const overview = ({ onWithdraw = () => {}, withdrawDisabled = true } = {}) => <GdsWalletOverview
    summary={summary} loading={loading} error={error} tmiPoints={tmiPoints} tmiLoading={tmiLoading}
    topupDisabled={creatingQr || cancelling || (!canCreateTopup && !payosQr && !topupResult)} withdrawDisabled={withdrawDisabled}
    onTopup={() => {
      if (payosQr && (!topupResult || ['AWAITING_TRANSFER', 'REVIEW', 'RECONCILING'].includes(topupResult.status))) { setPaymentDialogOpen(true); return; }
      if (topupResult && ['CREDITED', 'CANCELLED', 'EXPIRED'].includes(topupResult.status)) {
        activeTopupRef.current = null; refreshGeneration.current += 1; requestKeyRef.current = null;
        setPayosQr(null); setTopupResult(null);
      }
      setQrError(null); setCancelError(null); setTopupEntryOpen(true);
    }}
    onWithdraw={onWithdraw} onRetry={() => void refresh()}
    onRetryIncome={() => void refresh(() => true, true, activeTopupRef.current?.topupId)} />;
  return <div className="gds-wallet-page"><div className="gds-wallet-page__container">
    {summary && summary.mode !== 'disabled' && summary.withdrawalEnabled !== undefined
      ? <GdsWithdrawalPanel summary={summary} onChanged={() => void refresh(() => true, true)} renderOverview={overview} />
      : <>{overview()}<GdsWalletActivity enabled={hasTrustedBalance} revision={`${summary?.balance?.availableMinor}:${summary?.balance?.reservedMinor}:${summary?.debtMinor}`} /></>}
    {payosQr ? <p className="gds-wallet-page__pending-topup"><button type="button" onClick={() => setPaymentDialogOpen(true)}><SystemText message={"Xem QR đang chờ"} /></button></p> : null}
    {topupResult?.status === 'CREDITED' && topupResult.gdsCredited && !paymentDialogOpen ? <p role="status" className="gds-wallet-page__completed"><SystemText message={"Đã nạp"} /> <SystemValue render={() => (formatGdsVnd(topupResult.amountMinor))} />. <button type="button" onClick={() => setPaymentDialogOpen(true)}><SystemText message={"Xem kết quả"} /></button></p> : null}
  </div>
    <Modal open={topupEntryOpen} onOpenChange={setTopupEntryOpen} className="gds-topup-entry-modal" title={translateUI("Nạp tiền")} description={messageForUi("Chọn số tiền bạn muốn nạp vào ví.")}>
      <form className="gds-topup-entry" onSubmit={event => { event.preventDefault(); void createQr(); }}>
        <label htmlFor="gds-topup-amount"><SystemText message={"Số tiền nạp (VND)"} /></label>
        <div className="gds-wallet-page__amount-field"><input autoComplete="off" id="gds-topup-amount" inputMode="numeric" placeholder="0" onChange={event => updateAmount(event.target.value)} type="text" value={amountText} aria-describedby="gds-topup-limits" /><span aria-hidden="true">VND</span></div>
        <p id="gds-topup-limits" className="gds-topup-entry__limits"><SystemText message={"Từ 2.000 ₫ đến 10.000.000 ₫ mỗi lần"} /></p>
        <div className="gds-wallet-page__quick-amounts" role="group" aria-label={messageForUi("Chọn nhanh số tiền")}>{[10000,20000,50000,100000,200000,500000,1000000].map(amount => <button type="button" key={amount} aria-pressed={amountText === String(amount)} onClick={() => updateAmount(String(amount))}><SystemValue render={() => (formatGdsVnd(String(amount)))} /></button>)}</div>
        <div className="gds-topup-entry__total"><span><SystemText message={"Số tiền nạp"} /></span><strong>{amountPreview}</strong></div>
        {!canCreateTopup ? <p role="status"><SystemText message={"Nạp tiền đang tạm ngừng. Vui lòng thử lại sau."} /></p> : null}
        <Button disabled={!canCreateTopup || !isAmountValid || creatingQr || !!payosQr} size="lg" type="submit">{creatingQr ? <SystemText message={"Đang tạo mã QR…"} /> : <SystemText message={"Tạo mã QR"} />}</Button>
      </form>
    </Modal>
    <GdsTopupDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}
      qr={payosQr} result={topupResult} creating={creatingQr} error={qrError}
      onCancel={() => void cancelTopup()} cancelling={cancelling} cancelError={cancelError} />
  </div>;
}
