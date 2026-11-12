import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  certificateService,
  type CertificateVerification,
} from "../../services/certificate.service";
import { ApiClientError } from "../../services/api-client";
import "./CertificateVerificationPage.css";

export function CertificateVerificationPage() {
  const messageForUi = useSystemMessages();
  const { code: routeCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState(routeCode ?? "");
  const [certificate, setCertificate] = useState<CertificateVerification | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(routeCode));

  const verify = useCallback(async (code: string) => {
    setIsLoading(true);
    setCertificate(null);
    setErrorMessage(null);

    try {
      setCertificate(await certificateService.verifyCertificate(code));
    } catch (error) {
      setErrorMessage(getVerificationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeCode) {
      setCodeInput(routeCode);
      void verify(routeCode);
    } else {
      setIsLoading(false);
      setCertificate(null);
      setErrorMessage(null);
    }
  }, [routeCode, verify]);

  function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = codeInput.trim();

    if (!normalizedCode) {
      setErrorMessage("Vui lòng nhập mã chứng chỉ để xác thực.");
      return;
    }

    navigate(`/verify/${encodeURIComponent(normalizedCode)}`);
  }

  function resetVerification() {
    setCodeInput("");
    setCertificate(null);
    setErrorMessage(null);
    navigate("/verify");
  }

  return (
    <main className="certificate-verification-page">
      <section className="certificate-verification-hero">
        <div className="certificate-verification-hero__orb" aria-hidden="true" />
        <div className="certificate-verification-hero__content container">
          <Link className="certificate-verification-back" to="/">
            <ArrowLeft aria-hidden="true" />
            <SystemText message={"Về trang chủ"} />
          </Link>
          <span className="certificate-verification-eyebrow">
            <ShieldCheck aria-hidden="true" />
            <SystemText message={"Xác thực thành tích học tập"} />
          </span>
          <h1><SystemText message={"Kiểm tra chứng chỉ EduAI"} /></h1>
          <p>
            <SystemText message={"Nhập mã chứng chỉ để xác nhận thông tin hoàn thành khóa học trên hệ thống EduAI."} />
          </p>
        </div>
      </section>

      <section className="certificate-verification-main container">
        <form className="certificate-verification-search" onSubmit={submitVerification}>
          <label htmlFor="certificate-code"><SystemText message="Mã chứng chỉ" /></label>
          <div className="certificate-verification-search__field">
            <Search aria-hidden="true" />
            <input
              autoComplete="off"
              id="certificate-code"
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder={messageForUi("Ví dụ: CERT-ABC123")}
              spellCheck="false"
              value={codeInput}
            />
            <button disabled={isLoading} type="submit">
              {isLoading ? <LoaderCircle aria-hidden="true" className="is-spinning" /> : null}
              <SystemText message={"Xác thực"} />
            </button>
          </div>
        </form>

        {isLoading ? <VerificationLoadingState /> : null}

        {!isLoading && certificate ? <VerifiedCertificate certificate={certificate} onReset={resetVerification} /> : null}

        {!isLoading && errorMessage ? (
          <InvalidCertificateState message={errorMessage} onReset={resetVerification} />
        ) : null}

        {!isLoading && !certificate && !errorMessage ? <VerificationIntro /> : null}
      </section>
    </main>
  );
}

function VerifiedCertificate({
  certificate,
  onReset,
}: {
  certificate: CertificateVerification;
  onReset: () => void;
}) {
  const isRevoked = certificate.status === "revoked";

  return (
    <section
      aria-live="polite"
      className={`certificate-verification-result certificate-verification-result--${isRevoked ? "revoked" : "valid"}`}
    >
      <div className="certificate-verification-result__status">
        {isRevoked ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <span>{isRevoked ? <SystemText message={"Chứng chỉ đã bị thu hồi"} /> : <SystemText message={"Chứng chỉ hợp lệ"} />}</span>
      </div>
      <div className="certificate-verification-result__body">
        <div className="certificate-verification-result__seal" aria-hidden="true">
          <Award />
        </div>
        <span className="certificate-verification-eyebrow"><SystemText message={"EduAI · Chứng nhận hoàn thành"} /></span>
        <h2>{certificate.title}</h2>
        <p className="certificate-verification-result__course">{certificate.courseTitle}</p>
        <div className="certificate-verification-result__details">
          <div>
            <span><SystemText message="Người nhận" /></span>
            <strong>{certificate.recipientName}</strong>
          </div>
          <div>
            <span><SystemText message="Ngày cấp" /></span>
            <strong>{formatDate(certificate.issuedAt)}</strong>
          </div>
          <div>
            <span><SystemText message="Mã chứng chỉ" /></span>
            <strong>{certificate.certificateCode}</strong>
          </div>
          {isRevoked && certificate.revokedAt ? (
            <div>
              <span><SystemText message={"Ngày thu hồi"} /></span>
              <strong>{formatDate(certificate.revokedAt)}</strong>
            </div>
          ) : null}
        </div>
        <p className="certificate-verification-result__note">
          {isRevoked
            ? <SystemText message={"Mã chứng chỉ vẫn được giữ để tra cứu lịch sử, nhưng chứng chỉ không còn hiệu lực."} />
            : <SystemText message={"Thông tin chứng chỉ đã được EduAI xác thực."} />}
        </p>
        <div className="certificate-verification-result__actions">
          {certificate.verificationUrl ? (
            <a href={certificate.verificationUrl} rel="noreferrer" target="_blank">
              <ExternalLink aria-hidden="true" />
              <SystemText message={"Xem thông tin xác thực"} />
            </a>
          ) : null}
          <button onClick={onReset} type="button">
            <SystemText message={"Xác thực mã khác"} />
          </button>
        </div>
      </div>
    </section>
  );
}

function InvalidCertificateState({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <section aria-live="assertive" className="certificate-verification-result certificate-verification-result--invalid" role="alert">
      <AlertTriangle aria-hidden="true" />
      <h2><SystemText message={"Không tìm thấy chứng chỉ"} /></h2>
      <p>{message}</p>
      <button onClick={onReset} type="button"><SystemText message={"Thử mã khác"} /></button>
    </section>
  );
}

function VerificationIntro() {
  return (
    <section className="certificate-verification-intro">
      <div className="certificate-verification-intro__icon" aria-hidden="true">
        <ShieldCheck />
      </div>
      <h2><SystemText message={"Minh bạch và đáng tin cậy"} /></h2>
      <p><SystemText message={"Mỗi chứng chỉ EduAI có một mã duy nhất để bạn dễ dàng kiểm tra nguồn gốc và thời điểm cấp."} /></p>
    </section>
  );
}

function VerificationLoadingState() {
  const messageForUi = useSystemMessages();
  return (
    <section aria-busy="true" aria-label={messageForUi("Đang xác thực chứng chỉ")} className="certificate-verification-loading">
      <LoaderCircle aria-hidden="true" className="is-spinning" />
      <h2><SystemText message={"Đang kiểm tra chứng chỉ"} /></h2>
      <p><SystemText message={"Vui lòng chờ trong giây lát."} /></p>
    </section>
  );
}

function getVerificationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 404) {
    return "Mã chứng chỉ không tồn tại hoặc đã được nhập sai.";
  }

  return "Không thể kết nối đến hệ thống xác thực. Vui lòng thử lại.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(currentSystemLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
