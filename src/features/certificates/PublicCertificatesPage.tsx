import { Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../auth/auth-store";
import { usePlatform } from "../platform/PlatformProvider";
import { CertificatesPage } from "./CertificatesPage";
import "./PublicCertificatesPage.css";

export function PublicCertificatesPage() {
  const session = useAuthSession();
  const { t } = usePlatform();
  if (session) return <div className="public-certificates"><CertificatesPage /></div>;
  return (
    <section className="public-certificates__guest container">
      <Award aria-hidden="true" />
      <h1>{t("Chứng chỉ GDS", "GDS certificates")}</h1>
      <p>{t("Đăng nhập để xem, chia sẻ và xác thực những chứng chỉ bạn đã đạt được.", "Sign in to view, share and verify your certificates.")}</p>
      <div className="public-certificates__links">
        <Link to="/login">{t("Đăng nhập để xem chứng chỉ", "Sign in to view certificates")}</Link>
        <Link to="/verify">{t("Xác thực chứng chỉ", "Verify a certificate")}</Link>
      </div>
    </section>
  );
}
