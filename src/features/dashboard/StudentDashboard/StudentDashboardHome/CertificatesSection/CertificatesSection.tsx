import { CheckCircle2, Download } from "lucide-react";
import { certificateImage, certificates } from "../dashboardHomeData";
import "./CertificatesSection.css";

export function CertificatesSection() {
  return (
    <section className="student-dashboard__section">
      <div className="student-dashboard__section-header">
        <h2>Chứng chỉ mới nhất</h2>
        <button className="student-dashboard__download" type="button">
          <Download aria-hidden="true" />
          Tải tất cả
        </button>
      </div>

      <div className="student-dashboard__certificate-grid">
        {certificates.map((certificate) => (
          <article className="student-dashboard__certificate-card" key={certificate}>
            <div className="student-dashboard__certificate-image">
              <img alt={`Chứng chỉ ${certificate}`} src={certificateImage} />
            </div>
            <h3>{certificate}</h3>
            <div>
              <p>Cấp ngày: 12/05/2024</p>
              <CheckCircle2 aria-hidden="true" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
