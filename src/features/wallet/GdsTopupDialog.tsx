import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, ShieldAlert, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { formatGdsVnd, type GdsActiveTopup, type GdsPayosTopupQr } from '../../services/gds-wallet.service';

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void;
  qr: GdsPayosTopupQr | null; result: GdsActiveTopup | null;
  creating: boolean; error: string | null;
  onCancel: () => void; cancelling: boolean; cancelError: string | null;
};

export function GdsTopupDialog({ open, onOpenChange, qr, result, creating, error, onCancel, cancelling, cancelError }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => { setConfirmCancel(false); }, [open, qr?.topupId]);
  const canCancel = Boolean(qr && !creating && !error && (!result || result.status === 'AWAITING_TRANSFER'));
  const success = result?.status === 'CREDITED' && result.gdsCredited;
  const expired = result?.status === 'EXPIRED';
  const cancelled = result?.status === 'CANCELLED';
  const review = result?.status === 'REVIEW';
  const reconciling = result?.status === 'RECONCILING';
  const title = success ? 'Nạp tiền thành công'
    : expired ? 'Mã QR đã hết hạn' : cancelled ? 'Yêu cầu nạp đã hủy'
    : review ? 'Đang kiểm tra thanh toán' : reconciling ? 'Đang xác nhận thanh toán'
    : error ? 'Chưa tạo được mã QR' : creating ? 'Đang tạo mã QR' : 'Quét mã để nạp GDS';
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}
      description={success ? 'Số dư đã được cập nhật.' : qr && !result ? 'Mở ứng dụng ngân hàng để quét mã.' : 'Theo dõi trạng thái nạp tiền của bạn.'}>
      <div className="gds-topup-dialog">
        {success && result ? (
          <div className="gds-topup-dialog__success" role="status" aria-live="polite">
            <CheckCircle2 aria-hidden="true" />
            <strong>Nạp thành công</strong>
            <p>Đã cộng <b>{formatGdsVnd(result.amountMinor)}</b> vào Ví GDS.</p>
          </div>
        ) : error ? <p role="alert" className="gds-wallet-page__qr-error">{error}</p>
          : expired || cancelled ? (
            <div className="gds-topup-dialog__notice" role="alert">
              <XCircle aria-hidden="true" />
              <p>{expired ? 'Mã QR này không còn trong thời hạn thanh toán.' : 'Yêu cầu nạp này đã được hủy.'}</p>
              <p>Nếu bạn đã chuyển tiền, hãy kiểm tra ví hoặc liên hệ hỗ trợ trước khi chuyển thêm.</p>
            </div>
          ) : review || reconciling ? (
            <div className="gds-topup-dialog__notice" aria-live="polite">
              <ShieldAlert aria-hidden="true" />
              <p>{review ? 'Giao dịch đang được kiểm tra. Vui lòng chờ.' : 'Đang cập nhật số dư. Vui lòng chờ.'}</p>
              <p>Không chuyển thêm tiền cho yêu cầu này.</p>
            </div>
          ) : qr ? (
            <section className="gds-topup-dialog__payment" aria-label="Mã QR nạp ví">
              <img alt="Mã QR cho yêu cầu nạp Ví GDS" src={qr.qrCodeDataUrl} />
              <strong className="gds-topup-dialog__amount">{formatGdsVnd(qr.amountMinor)}</strong>
              <dl>
                <div><dt>Nội dung chuyển khoản</dt><dd>{qr.transferMemo}</dd></div>
                <div><dt>Tài khoản nhận</dt><dd>{qr.receivingAccount}</dd></div>
                <div><dt>Thời hạn</dt><dd>{Number.isFinite(Date.parse(qr.expiresAt)) ? new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short', dateStyle: 'short' }).format(new Date(qr.expiresAt)) : 'Xem trang thanh toán'}</dd></div>
              </dl>
              <p className="gds-topup-dialog__waiting"><Clock3 aria-hidden="true" /> Đang chờ thanh toán</p>
              <a href={qr.checkoutUrl} target="_blank" rel="noreferrer noopener">Mở trang thanh toán</a>
              <p className="gds-topup-dialog__hint">Chuyển đúng số tiền và nội dung trên mã QR.</p>
            </section>
          ) : <p aria-live="polite">Đang chuẩn bị mã thanh toán…</p>}
        {cancelError ? <p role="alert" className="gds-topup-dialog__cancel-error">{cancelError}</p> : null}
        {canCancel && confirmCancel ? <div className="gds-topup-dialog__cancel-confirm">
          <p>Bạn chắc chắn muốn hủy yêu cầu này? Nếu đã chuyển tiền, hãy giữ yêu cầu.</p>
          <div className="gds-topup-dialog__actions">
            <Button type="button" variant="secondary" disabled={cancelling} onClick={() => setConfirmCancel(false)}>Giữ mã QR</Button>
            <Button type="button" variant="outline" disabled={cancelling} onClick={onCancel}>{cancelling ? 'Đang hủy…' : 'Xác nhận hủy'}</Button>
          </div>
        </div> : null}
        <div className="gds-topup-dialog__actions">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Về ví</Button>
          {success ? <><Link className={buttonVariants({ variant: 'secondary' })} to="/courses" onClick={() => onOpenChange(false)}>Mua khóa học</Link><Link className={buttonVariants({ variant: 'secondary' })} to="/membership" onClick={() => onOpenChange(false)}>Gói thành viên</Link></> : null}
          {canCancel && !confirmCancel ? <Button type="button" variant="outline" onClick={() => setConfirmCancel(true)}>Hủy yêu cầu</Button> : null}
        </div>
        {!success && !expired && !cancelled && !error ? <p className="gds-topup-dialog__hint">Bạn có thể quay lại ví và mở lại mã QR.</p> : null}
      </div>
    </Modal>
  );
}
