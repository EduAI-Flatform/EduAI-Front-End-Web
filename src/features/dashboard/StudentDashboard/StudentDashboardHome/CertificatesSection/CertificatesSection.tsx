import { CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { Certificate } from "../../../../../services/certificate.service";
import "./CertificatesSection.css";

export function CertificatesSection({
  certificates,
}: {
  certificates: Certificate[];
}) {
  return (
    <section className="student-dashboard__section">
      <div className="student-dashboard__section-header">
        <h2>Chứng chỉ mới nhất</h2>
        <Link className="student-dashboard__download" to="/dashboard/certificates">
          <ExternalLink aria-hidden="true" />
          Xem tất cả
        </Link>
      </div>

      {certificates.length > 0 ? (
        <div className="student-dashboard__certificate-grid">
        {certificates.map((certificate) => (
          <article className="student-dashboard__certificate-card" key={certificate.id}>
            <div className="student-dashboard__certificate-image">
              <img
                alt={`Chứng chỉ ${certificate.title}`}
                src="/demo-assets/certificate-preview.svg"
              />
            </div>
            <h3>{certificate.title}</h3>
            <div>
              <p>
                Cấp ngày:{" "}
                {new Intl.DateTimeFormat("vi-VN").format(
                  new Date(certificate.issuedAt),
                )}
              </p>
              <CheckCircle2 aria-hidden="true" />
            </div>
          </article>
        ))}
        </div>
      ) : (
        <p className="student-dashboard__section-empty" role="status">
          Hoàn thành khóa học để nhận chứng chỉ đầu tiên.
        </p>
      )}
    </section>
  );
}
