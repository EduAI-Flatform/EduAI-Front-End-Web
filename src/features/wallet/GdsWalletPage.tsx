import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, Clock3, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
  formatGdsVnd,
  gdsWalletService,
  getGdsWalletError,
  type GdsWalletSummary,
  type GdsWalletState,
} from '../../services/gds-wallet.service';
import './GdsWalletPage.css';

const STATE_LABELS: Record<GdsWalletState, string> = {
  UNAVAILABLE: 'Chưa kích hoạt',
  NOT_INITIALIZED: 'Chưa khởi tạo',
  SUSPENDED: 'Tạm khóa',
  READY_SANDBOX: 'Ví thử nghiệm',
  RECONCILIATION_REQUIRED: 'Cần đối soát',
};

const STATE_DESCRIPTIONS: Record<GdsWalletState, string> = {
  UNAVAILABLE: 'Ví GDS chưa được bật trong môi trường này.',
  NOT_INITIALIZED: 'Hệ thống chưa khởi tạo số dư GDS cho tài khoản của bạn.',
  SUSPENDED: 'Ví đang tạm khóa. Bạn chưa thể thực hiện giao dịch.',
  READY_SANDBOX: 'Đây là số dư thử nghiệm, chưa dùng để thanh toán thật.',
  RECONCILIATION_REQUIRED: 'Dữ liệu ví cần được kiểm tra trước khi hiển thị số dư.',
};

const STEPS = [
  'Nhập chính xác số tiền VND muốn nạp',
  'PayOS tạo QR đúng số tiền và nội dung',
  'Backend xác minh giao dịch đã thanh toán',
  'Đối soát hợp lệ rồi mới ghi có GDS 1:1',
] as const;

export function GdsWalletPage() {
  const [summary, setSummary] = useState<GdsWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('100000');

  const refresh = useCallback(async (isMounted: () => boolean = () => true) => {
    setLoading(true);
    setError(null);
    try {
      const next = await gdsWalletService.summary();
      if (isMounted()) setSummary(next);
    } catch (cause) {
      if (isMounted()) {
        setSummary(null);
        setError(getGdsWalletError(cause));
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void refresh(() => mounted);
    return () => { mounted = false; };
  }, [refresh]);

  const hasTrustedBalance = !loading && !error && summary?.available &&
    summary.state === 'READY_SANDBOX' && summary.balance?.currency === 'VND';
  const currentBalance = hasTrustedBalance ? formatGdsVnd(summary.balance?.availableMinor) : '—';
  const state = summary?.state ?? 'UNAVAILABLE';
  const isAmountValid = /^[1-9]\d{0,8}$/.test(amountText);
  const amountPreview = isAmountValid ? formatGdsVnd(amountText) : '—';

  return (
    <div className="gds-wallet-page">
      <div className="gds-wallet-page__container">
        <header className="gds-wallet-page__heading">
          <div>
            <h1>Ví GDS</h1>
            <p>Số dư dịch vụ nội bộ dành cho khóa học và gói thành viên</p>
          </div>
          <span className="gds-wallet-page__environment">SANDBOX · CHƯA GIAO DỊCH THẬT</span>
        </header>

        <div className="gds-wallet-page__balance-grid">
          <section aria-labelledby="gds-balance-title" className="gds-wallet-page__balance-card">
            <span id="gds-balance-title" className="gds-wallet-page__balance-label">SỐ DƯ KHẢ DỤNG</span>
            <strong aria-live="polite" className="gds-wallet-page__balance-value">
              {loading ? 'Đang tải…' : currentBalance}
            </strong>
            <span className="gds-wallet-page__balance-description">
              {error ?? (summary ? STATE_DESCRIPTIONS[state] : 'Đang kiểm tra trạng thái Ví GDS…')}
            </span>
            <div className="gds-wallet-page__balance-actions">
              <Button disabled size="lg" type="button"><ArrowDownToLine aria-hidden="true" />Nạp GDS · chưa khả dụng</Button>
              <span className="gds-wallet-page__balance-status">{summary ? STATE_LABELS[state] : 'Chưa xác định'}</span>
            </div>
          </section>
          <section aria-labelledby="gds-tmi-title" className="gds-wallet-page__panel gds-wallet-page__tmi-card">
            <h2 id="gds-tmi-title">Điểm thưởng TMI</h2>
            <p>Tách biệt với Ví GDS</p>
            <span className="gds-wallet-page__tmi-rule" />
            <p className="gds-wallet-page__tmi-message">TMI không phải tiền và không dùng để nạp ví.</p>
            <Link className="gds-wallet-page__text-link" to="/dashboard/tmi">Xem điểm thưởng TMI</Link>
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
                onChange={(event) => setAmountText(event.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                type="text"
                value={amountText}
                aria-describedby="gds-topup-preview gds-topup-explanation"
              />
              <span aria-hidden="true">₫</span>
            </div>
            <p aria-live="polite" className="gds-wallet-page__amount-preview" id="gds-topup-preview">
              GDS nhận dự kiến: {amountPreview} · Phí nạp: 0 ₫
            </p>
            <Button disabled size="lg" type="button">Tạo mã QR PayOS · chưa mở</Button>
            <p id="gds-topup-explanation" className="gds-wallet-page__help-text">
              Chức năng tạo mã QR chưa được kết nối. Không có tiền nào được chuyển hoặc cộng vào ví từ trang này.
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
            <span>CHƯA KẾT NỐI LỊCH SỬ</span>
          </div>
          <div className="gds-wallet-page__history-empty">
            <Clock3 aria-hidden="true" />
            <p>API lịch sử giao dịch GDS chưa được triển khai. Trang này không tạo dữ liệu giao dịch giả.</p>
          </div>
        </section>

        {error ? <div className="gds-wallet-page__error" role="alert">{error}</div> : null}
        <div className="gds-wallet-page__refresh"><Button disabled={loading} onClick={() => void refresh()} variant="outline" type="button"><RefreshCw aria-hidden="true" />Làm mới số dư</Button></div>
        <p className="gds-wallet-page__footer-note"><Wallet aria-hidden="true" />Ví GDS chỉ dành cho thanh toán dịch vụ EduAI theo chính sách áp dụng; không hỗ trợ rút tiền tùy ý.</p>
      </div>
    </div>
  );
}
