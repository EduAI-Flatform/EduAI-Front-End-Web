import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
  formatGdsVnd,
  gdsWalletService,
  getGdsWalletError,
  getGdsPayosQrError,
  type GdsPayosTopupQr,
  type GdsWalletSummary,
  type GdsWalletState,
} from '../../services/gds-wallet.service';
import { tmiService } from '../../services/tmi.service';
import './GdsWalletPage.css';

const STATE_DESCRIPTIONS: Record<GdsWalletState, string> = {
  UNAVAILABLE: 'Ví GDS chưa được bật trong môi trường này.',
  NOT_INITIALIZED: 'Bạn chưa có số dư GDS đã xác minh. Có thể tạo mã QR nạp tiền bên dưới; số dư sẽ xuất hiện sau khi hệ thống xác nhận giao dịch.',
  SUSPENDED: 'Ví đang tạm khóa. Bạn chưa thể thực hiện giao dịch.',
  READY_SANDBOX: 'Số dư GDS trên môi trường kiểm thử; tách biệt với website chính thức.',
  RECONCILIATION_REQUIRED: 'Dữ liệu ví cần được kiểm tra trước khi hiển thị số dư.',
};

const STEPS = [
  'Nhập chính xác số tiền VND muốn nạp',
  'PayOS tạo QR đúng số tiền và nội dung',
  'Hệ thống kiểm tra thông báo và đối soát trực tiếp với PayOS',
  'Sau khi đối soát hợp lệ, hệ thống mới cộng GDS theo tỷ lệ 1:1',
] as const;

const TRANSACTION_LABELS = {
  TOPUP_CREDIT: 'Nạp GDS đã xác minh',
  RESERVE: 'Giữ GDS cho đơn hàng',
  CAPTURE: 'Thanh toán bằng GDS',
  RELEASE: 'Hoàn GDS đã giữ',
} as const;

export function GdsWalletPage() {
  const [summary, setSummary] = useState<GdsWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('100000');
  const [tmiPoints, setTmiPoints] = useState<number | null>(null);
  const [tmiLoading, setTmiLoading] = useState(true);
  const [payosQr, setPayosQr] = useState<GdsPayosTopupQr | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [creatingQr, setCreatingQr] = useState(false);
  const requestKeyRef = useRef<{ amount: string; key: string } | null>(null);
  const amountRef = useRef(amountText);

  const refresh = useCallback(async (isMounted: () => boolean = () => true, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await gdsWalletService.summary();
      if (isMounted()) setSummary(next);
    } catch (cause) {
      if (isMounted() && !silent) {
        setSummary(null);
        setError(getGdsWalletError(cause));
      }
    } finally {
      if (isMounted() && !silent) setLoading(false);
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
    const until = Date.parse(payosQr.expiresAt) + 60_000;
    if (!Number.isFinite(until)) return;
    let mounted = true;
    const interval = setInterval(() => {
      if (Date.now() > until) { clearInterval(interval); return; }
      void refresh(() => mounted, true);
    }, 10_000);
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
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 9);
    amountRef.current = cleaned;
    setAmountText(cleaned);
    setPayosQr(null);
    setQrError(null);
    requestKeyRef.current = null;
  };

  const hasTrustedBalance = !loading && !error && summary?.available &&
    summary.state === 'READY_SANDBOX' && summary.balance?.currency === 'VND';
  const currentBalance = hasTrustedBalance ? formatGdsVnd(summary.balance?.availableMinor) : '—';
  const state = summary?.state ?? 'UNAVAILABLE';
  const isAmountValid = /^[1-9]\d{0,8}$/.test(amountText) &&
    Number(amountText) >= 2_000 && Number(amountText) <= 10_000_000;
  const amountPreview = isAmountValid ? formatGdsVnd(amountText) : '—';
  const history = hasTrustedBalance && Array.isArray(summary?.recentTransactions)
    ? summary.recentTransactions : null;

  const createQr = async () => {
    if (creatingQr || !isAmountValid) return;
    const requestedAmount = amountText;
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
          !/^G[A-Z0-9]{8}$/.test(qr.transferMemo) || !/^\d{6,32}$/.test(qr.receivingAccount) ||
          !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qr.qrCodeDataUrl) ||
          !/^https:\/\/(pay\.payos\.vn|next\.pay\.payos\.vn)\//.test(qr.checkoutUrl)) {
        throw new Error('Untrusted PayOS QR response');
      }
      setPayosQr(qr);
      void refresh(() => true, true);
    } catch (cause) {
      if (amountRef.current === requestedAmount) setQrError(getGdsPayosQrError(cause));
    } finally {
      setCreatingQr(false);
    }
  };

  return (
    <div className="gds-wallet-page">
      <div className="gds-wallet-page__container">
        <div className="gds-wallet-page__balance-grid">
          <section aria-labelledby="gds-wallet-title" className="gds-wallet-page__balance-card">
            <header className="gds-wallet-page__balance-intro">
              <h1 id="gds-wallet-title">Ví GDS</h1>
              <p>Số dư dịch vụ nội bộ dành cho khóa học và gói thành viên</p>
            </header>
            <span id="gds-balance-title" className="gds-wallet-page__balance-label">SỐ DƯ KHẢ DỤNG</span>
            <strong aria-live="polite" className="gds-wallet-page__balance-value">
              {loading ? 'Đang tải…' : currentBalance}
            </strong>
            <span className="gds-wallet-page__balance-description">
              {error ?? (summary ? STATE_DESCRIPTIONS[state] : 'Đang kiểm tra trạng thái Ví GDS…')}
            </span>
          </section>
          <section aria-labelledby="gds-tmi-title" className="gds-wallet-page__panel gds-wallet-page__tmi-card">
            <h2 id="gds-tmi-title">Điểm thưởng TMI</h2>
            <p>Số điểm thưởng hiện có</p>
            <span className="gds-wallet-page__tmi-rule" />
            <strong aria-live="polite" className="gds-wallet-page__tmi-points">
              {tmiLoading ? 'Đang tải…' : tmiPoints === null ? '—' : `${new Intl.NumberFormat('vi-VN').format(tmiPoints)} điểm`}
            </strong>
            <p className="gds-wallet-page__tmi-message">Điểm TMI được quản lý riêng với số dư GDS.</p>
            <Link className="gds-wallet-page__text-link" to="/dashboard/tmi">Đổi điểm thưởng TMI</Link>
          </section>
        </div>

        <div className="gds-wallet-page__details-grid">
          <section aria-labelledby="gds-topup-title" className="gds-wallet-page__panel gds-wallet-page__topup-card">
            <h2 id="gds-topup-title">Nạp tiền qua QR PayOS</h2>
            <label htmlFor="gds-topup-amount">Nhập số tiền chính xác muốn nạp (VND)</label>
            <div className="gds-wallet-page__amount-field">
              <input
                autoComplete="off"
                id="gds-topup-amount"
                inputMode="numeric"
                onChange={(event) => updateAmount(event.target.value)}
                type="text"
                value={amountText}
                aria-describedby="gds-topup-preview gds-topup-explanation"
              />
              <span aria-hidden="true">₫</span>
            </div>
            <p aria-live="polite" className="gds-wallet-page__amount-preview" id="gds-topup-preview">
              Số tiền trên QR: {amountPreview} · GDS dự kiến sau xác nhận: {amountPreview}
            </p>
            <Button disabled={!isAmountValid || creatingQr} onClick={() => void createQr()} size="lg" type="button">
              {creatingQr ? 'Đang tạo mã QR…' : 'Tạo mã QR PayOS'}
            </Button>
            {!isAmountValid ? <p className="gds-wallet-page__help-text">Số tiền hợp lệ từ 2.000 ₫ đến 10.000.000 ₫.</p> : null}
            {qrError ? <p className="gds-wallet-page__qr-error" role="alert">{qrError}</p> : null}
            {payosQr ? (
              <section aria-label="Mã QR PayOS nạp ví" className="gds-wallet-page__qr-result">
                <h3>Mã QR PayOS đã tạo</h3>
                <img alt="Mã QR PayOS cho yêu cầu nạp Ví GDS" src={payosQr.qrCodeDataUrl} />
                <dl>
                  <div><dt>Số tiền</dt><dd>{formatGdsVnd(payosQr.amountMinor)}</dd></div>
                  <div><dt>Nội dung chuyển khoản</dt><dd>{payosQr.transferMemo}</dd></div>
                  <div><dt>Tài khoản nhận</dt><dd>{payosQr.receivingAccount}</dd></div>
                  <div><dt>Thời hạn</dt><dd>{Number.isFinite(Date.parse(payosQr.expiresAt)) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(payosQr.expiresAt)) : 'Kiểm tra trên PayOS'}</dd></div>
                </dl>
                <a href={payosQr.checkoutUrl} rel="noreferrer noopener" target="_blank">Xem thông tin trên PayOS</a>
                <p className="gds-wallet-page__qr-caution">QR PayOS có thể nhận tiền thật. Hãy kiểm tra tên người nhận trên ứng dụng ngân hàng. Sau khi chuyển khoản đúng thông tin, hệ thống sẽ đối soát với PayOS và cập nhật số dư khi đủ điều kiện. Giao dịch bất thường sẽ cần kiểm tra bổ sung.</p>
              </section>
            ) : null}
            <p id="gds-topup-explanation" className="gds-wallet-page__help-text">
              Tạo mã QR không đồng nghĩa đã nạp tiền. Số dư được tự cập nhật sau khi hệ thống xác minh khoản chuyển thành công; bạn cũng có thể tải lại trang để kiểm tra.
            </p>
          </section>

          <section aria-labelledby="gds-verification-title" className="gds-wallet-page__panel gds-wallet-page__verification-card">
            <h2 id="gds-verification-title">Khi nào GDS được cộng?</h2>
            <ol className="gds-wallet-page__steps">
              {STEPS.map((step, index) => (
                <li key={step}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <p className="gds-wallet-page__help-text"><ShieldCheck aria-hidden="true" />Quét QR hoặc quay lại trang không chứng minh đã thanh toán.</p>
          </section>
        </div>

        <section aria-labelledby="gds-history-title" className="gds-wallet-page__panel gds-wallet-page__history">
          <div className="gds-wallet-page__history-heading">
            <h2 id="gds-history-title">Lịch sử giao dịch</h2>
            <span>{history ? '20 GIAO DỊCH GẦN NHẤT' : 'CHƯA CÓ LỊCH SỬ'}</span>
          </div>
          {history && history.length > 0 ? (
            <ul className="gds-wallet-page__history-list" aria-label="Giao dịch từ sổ cái GDS">
              {history.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{TRANSACTION_LABELS[entry.type] ?? 'Giao dịch cần đối soát'}</strong>
                    <time dateTime={entry.occurredAt}>
                      {Number.isFinite(Date.parse(entry.occurredAt))
                        ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.occurredAt))
                        : 'Thời gian chưa xác minh'}
                    </time>
                  </div>
                  <span>{entry.type === 'TOPUP_CREDIT' || entry.type === 'RELEASE' ? '+' : '−'}{formatGdsVnd(entry.amountMinor)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="gds-wallet-page__history-empty">
              <Clock3 aria-hidden="true" />
              <p>{history ? 'Bạn chưa có giao dịch GDS.'
                : 'Lịch sử giao dịch GDS sẽ hiển thị khi hệ thống sẵn sàng.'}</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
