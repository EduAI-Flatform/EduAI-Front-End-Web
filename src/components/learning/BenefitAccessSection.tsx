import { Coins, GraduationCap, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import "./BenefitAccessSection.css";

const benefitLinks = [
  {
    label: "Học bổng",
    note: "Tìm khóa học có hỗ trợ",
    icon: GraduationCap,
    path: "/courses",
    tone: "blue",
  },
  {
    label: "Voucher",
    note: "Xem ưu đãi khi đăng ký",
    icon: Ticket,
    path: "/courses",
    tone: "purple",
  },
  {
    label: "Điểm TMI",
    note: "Đổi điểm lấy phần thưởng",
    icon: Coins,
    path: "/dashboard/tmi",
    tone: "gold",
  },
] as const;

export function BenefitAccessSection() {
  return (
    <section aria-labelledby="benefit-access-heading" className="benefit-access">
      <div className="benefit-access__heading">
        <div>
          <span className="benefit-access__eyebrow">Quyền lợi học viên</span>
          <h2 id="benefit-access-heading">Học nhiều hơn, nhận nhiều hơn</h2>
        </div>
        <p>Truy cập nhanh các ưu đãi và phần thưởng của EduAI.</p>
      </div>

      <div className="benefit-access__grid">
        {benefitLinks.map((benefit) => {
          const Icon = benefit.icon;

          return (
            <Link
              className="benefit-access__link"
              key={benefit.label}
              to={benefit.path}
            >
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
