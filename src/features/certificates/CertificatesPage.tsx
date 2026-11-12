import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import {
  AlertTriangle,
  Award,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  certificateService,
  getCertificateErrorMessage,
  type Certificate,
} from "../../services/certificate.service";
import "./CertificatesPage.css";

export function CertificatesPage() {
  const messageForUi = useSystemMessages();
  const [searchParams] = useSearchParams();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCertificates = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setCertificates(await certificateService.listMyCertificates());
    } catch (error) {
      setCertificates([]);
      setErrorMessage(getCertificateErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  const selectedCertificate =
    certificates.find(
      (certificate) => certificate.id === (selectedId ?? searchParams.get("certificate")),
    ) ?? certificates[0];

  return (
    <div className="certificates-page student-dashboard__shell container">
      <header className="certificates-page__header">
        <div>
          <span className="certificates-page__eyebrow"><SystemText message={"Thành quả học tập"} /></span>
          <h1><SystemText message="Chứng chỉ của tôi" /></h1>
          <p><SystemText message={"Lưu giữ và chia sẻ những dấu mốc bạn đã hoàn thành trên EduAI."} /></p>
        </div>
        {!isLoading && !errorMessage ? (
          <span className="certificates-page__count">
            {certificates.length} <SystemText message={"chứng chỉ"} />
          </span>
        ) : null}
      </header>

      {isLoading ? <CertificatesLoadingState /> : null}

      {!isLoading && errorMessage ? (
        <section className="certificates-page__state certificates-page__state--error" role="alert">
          <RefreshCw aria-hidden="true" />
          <h2><SystemText message="Chưa thể tải chứng chỉ" /></h2>
          <p>{errorMessage}</p>
          <button onClick={() => void loadCertificates()} type="button">
            <RefreshCw aria-hidden="true" /><SystemText message="Thử lại" /></button>
        </section>
      ) : null}

      {!isLoading && !errorMessage && certificates.length === 0 ? (
        <section className="certificates-page__state" role="status">
          <Award aria-hidden="true" />
          <h2><SystemText message="Chưa có chứng chỉ nào" /></h2>
          <p><SystemText message={"Hoàn thành một khóa học để nhận chứng chỉ đầu tiên của bạn."} /></p>
        </section>
      ) : null}

      {!isLoading && !errorMessage && certificates.length > 0 ? (
        <div className="certificates-page__layout">
          <section aria-label={messageForUi("Danh sách chứng chỉ")} className="certificates-page__list">
            <div className="certificates-page__section-heading">
              <div>
                <span className="certificates-page__eyebrow"><SystemText message={"Bộ sưu tập"} /></span>
                <h2><SystemText message={"Chứng chỉ đã đạt được"} /></h2>
              </div>
              <ShieldCheck aria-hidden="true" />
            </div>

            <div className="certificates-page__cards">
              {certificates.map((certificate) => (
                <CertificateCard
                  certificate={certificate}
                  isSelected={certificate.id === selectedCertificate?.id}
                  key={certificate.id}
                  onSelect={() => setSelectedId(certificate.id)}
                />
              ))}
            </div>
          </section>

          {selectedCertificate ? <CertificatePreview certificate={selectedCertificate} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function CertificateCard({
  certificate,
  isSelected,
  onSelect,
}: {
  certificate: Certificate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isRevoked = certificate.status === "revoked";

  return (
    <button
      aria-pressed={isSelected}
      className={`certificate-card${isSelected ? " certificate-card--selected" : ""}${isRevoked ? " certificate-card--revoked" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <span className="certificate-card__icon" aria-hidden="true">
        <Award />
      </span>
      <span className="certificate-card__content">
        <strong>{certificate.title}</strong>
        {isRevoked ? <span className="certificate-card__status"><SystemText message={"Đã thu hồi"} /></span> : null}
        <span>{certificate.courseTitle ?? <SystemText message={"Chứng chỉ hoàn thành khóa học"} />}</span>
        <small>
          <CalendarDays aria-hidden="true" />
          <SystemText message={"Cấp ngày"} /> {formatDate(certificate.issuedAt)}
        </small>
      </span>
      <Eye aria-hidden="true" className="certificate-card__view" />
    </button>
  );
}

function CertificatePreview({ certificate }: { certificate: Certificate }) {
  const messageForUi = useSystemMessages();
  const isRevoked = certificate.status === "revoked";

  return (
    <aside aria-label={messageForUi("Xem trước chứng chỉ")} className="certificate-preview-panel">
      <div className="certificate-preview-panel__heading">
        <div>
          <span className="certificates-page__eyebrow"><SystemText message="Xem trước" /></span>
          <h2><SystemText message={"Chi tiết chứng chỉ"} /></h2>
        </div>
        {isRevoked ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      </div>

      <div className={`certificate-preview${isRevoked ? " certificate-preview--revoked" : ""}`}>
        <div className="certificate-preview__seal" aria-hidden="true">
          <Award />
        </div>
        <span className="certificate-preview__label"><SystemText message={"EduAI · Chứng nhận hoàn thành"} /></span>
        <h3>{certificate.title}</h3>
        <p className="certificate-preview__course">
          {certificate.courseTitle ?? <SystemText message={"Khóa học trực tuyến"} />}
        </p>
        <div className="certificate-preview__rule" />
        <p className="certificate-preview__date"><SystemText message={"Cấp ngày"} /> {formatDate(certificate.issuedAt)}</p>
        <p className="certificate-preview__code"><SystemText message={"Mã chứng chỉ:"} /> {certificate.certificateCode}</p>
        {isRevoked ? (
          <div className="certificate-preview__revocation" role="status">
            <strong><SystemText message={"Đã thu hồi"} /></strong>
            {certificate.revokedAt ? <span><SystemText message={"Ngày"} /> {formatDate(certificate.revokedAt)}</span> : null}
            {certificate.revocationReason ? <p>{certificate.revocationReason}</p> : null}
          </div>
        ) : null}
        {certificate.qrCodeUrl && !isRevoked ? (
          <img
            alt={messageForUi("Mã QR xác thực chứng chỉ")}
            className="certificate-preview__qr"
            src={certificate.qrCodeUrl}
          />
        ) : (
          <div className="certificate-preview__qr certificate-preview__qr--empty">
            <QrCode aria-hidden="true" />
            <span><SystemText message={"Mã QR đang được cập nhật"} /></span>
          </div>
        )}
      </div>

      <div className="certificate-preview-panel__actions">
        {certificate.qrCodeUrl && !isRevoked ? (
          <a
            className="certificate-preview-panel__button certificate-preview-panel__button--primary"
            download={`${certificate.certificateCode}.png`}
            href={certificate.qrCodeUrl}
          >
            <Download aria-hidden="true" />
            <SystemText message={"Tải mã QR"} />
          </a>
        ) : null}
        {certificate.verificationUrl ? (
          <a
            className="certificate-preview-panel__button"
            href={certificate.verificationUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" />
            <SystemText message={"Mở trang xác thực"} />
          </a>
        ) : null}
      </div>
    </aside>
  );
}

function CertificatesLoadingState() {
  const messageForUi = useSystemMessages();
  return (
    <section aria-busy="true" aria-label={messageForUi("Đang tải chứng chỉ")} className="certificates-page__loading">
      {[0, 1, 2].map((item) => (
        <div className="certificate-card certificate-card--skeleton" key={item}>
          <span />
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(currentSystemLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
