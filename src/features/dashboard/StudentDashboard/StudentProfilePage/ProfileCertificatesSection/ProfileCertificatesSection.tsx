import { Award } from "lucide-react";
import { certificates } from "../profilePageData";
import "./ProfileCertificatesSection.css";

export function ProfileCertificatesSection() {
  return (
    <section className="student-profile-card student-profile-certificates">
      <div className="student-profile-card__header">
        <h2>Chứng chỉ đạt được</h2>
      </div>

      <div className="student-profile-certificates__grid">
        {certificates.map((certificate) => (
          <article className="student-profile-certificate" key={certificate.title}>
            <div className="student-profile-certificate__image">
              {certificate.image ? (
                <img alt="" src={certificate.image} />
              ) : (
                <Award aria-hidden="true" />
              )}
            </div>
            <h3>{certificate.title}</h3>
            <p>
              {certificate.issuer} • {certificate.issuedAt}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
