import { Coins, GraduationCap, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatform } from "../../features/platform/PlatformProvider";
import "./BenefitAccessSection.css";

export function BenefitAccessSection() {
  const { t } = usePlatform();
  const benefitLinks = [
    { label: t("Học bổng", "Scholarships"), note: t("Tìm khóa học có hỗ trợ", "Find supported courses"), icon: GraduationCap, path: "/courses", tone: "blue" },
    { label: "Voucher", note: t("Xem ưu đãi khi đăng ký", "Explore enrollment offers"), icon: Ticket, path: "/courses", tone: "purple" },
    { label: "GDS Point", note: t("Đổi điểm lấy phần thưởng", "Redeem points for rewards"), icon: Coins, path: "/dashboard/tmi", tone: "gold" },
  ];
  return (
    <section aria-labelledby="benefit-access-heading" className="benefit-access">
      <div className="benefit-access__heading">
        <div>
          <span className="benefit-access__eyebrow">{t("Quyền lợi học viên", "Learner benefits")}</span>
          <h2 id="benefit-access-heading">{t("Học nhiều hơn, nhận nhiều hơn", "Learn more, earn more")}</h2>
        </div>
        <p>{t("Truy cập nhanh các ưu đãi và phần thưởng của GDS.", "Quick access to GDS benefits and rewards.")}</p>
      </div>
      <div className="benefit-access__grid">
        {benefitLinks.map(benefit => {
          const Icon = benefit.icon;
          return (
            <Link className="benefit-access__link" key={benefit.path + benefit.label} to={benefit.path}>
              <span className={`benefit-access__icon benefit-access__icon--${benefit.tone}`}>
                <Icon aria-hidden="true" />
              </span>
              <span className="benefit-access__copy">
                <strong>{benefit.label}</strong>
                <small>{benefit.note}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
