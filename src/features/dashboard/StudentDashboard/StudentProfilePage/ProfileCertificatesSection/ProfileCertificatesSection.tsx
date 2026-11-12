import { currentSystemLocale } from "../../../../platform/translate-system-message";
import certificateImage from "@/assets/gds-certificate-preview.svg";
import { SystemText } from '@/features/platform/SystemText';
import type { Certificate } from "../../../../../services/certificate.service";
import "./ProfileCertificatesSection.css";

export function ProfileCertificatesSection({
  certificates,
  isLoading,
}: {
  certificates: Certificate[];
  isLoading: boolean;
}) {
  return (
    <section className="student-profile-card student-profile-certificates">
      <div className="student-profile-card__header">
        <h2><SystemText message={"Chứng chỉ đạt được"} /></h2>
      </div>

      {isLoading ? (
        <div className="student-profile-skeleton"><SystemText message={"Đang tải chứng chỉ..."} /></div>
      ) : certificates.length > 0 ? (
        <div className="student-profile-certificates__grid">
        {certificates.map((certificate) => (
          <article className="student-profile-certificate" key={certificate.id}>
            <div className="student-profile-certificate__image">
              <img
                alt=""
                src={certificateImage}
              />
            </div>
            <h3>{certificate.title}</h3>
            <p>
              {certificate.courseTitle ?? <SystemText message={"Khóa học GDS"} />} •{" "}
              {new Intl.DateTimeFormat(currentSystemLocale()).format(
                new Date(certificate.issuedAt),
              )}
            </p>
          </article>
        ))}
        </div>
      ) : (
        <p className="student-profile-empty" role="status">
          <SystemText message={"Chưa có chứng chỉ nào."} />
        </p>
      )}
    </section>
  );
}
