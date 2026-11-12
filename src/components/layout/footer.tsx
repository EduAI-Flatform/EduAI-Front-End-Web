import { Link } from "react-router-dom";
import { GdsBrand } from "../brand/GdsBrand";
import { usePlatform } from "../../features/platform/PlatformProvider";
import "./footer.css";

export default function Footer() {
  const { t } = usePlatform();
  const footerGroups = [
    {
      title: t("Sản phẩm", "Products"), links: [
        { label: t("Khóa học", "Courses"), path: "/courses" },
        { label: t("Tính năng AI", "AI tools"), path: "/ai" },
      ]
    },
    {
      title: t("Học tập", "Learning"), links: [
        { label: t("Thư viện", "Library"), path: "/library" },
        { label: t("Chứng chỉ", "Certificates"), path: "/verify" },
      ]
    },
    {
      title: t("Cộng đồng", "Community"), links: [
        { label: t("Tham gia cộng đồng", "Join the community"), path: "/community" },
      ]
    },
    {
      title: t("Pháp lý", "Legal"), links: [
        { label: t("Điều khoản sử dụng", "Terms of service"), path: "/terms" },
        { label: t("Chính sách bảo mật", "Privacy policy"), path: "/privacy" },
        { label: t("Yêu cầu xóa dữ liệu", "Data deletion request"), path: "/data-deletion" },
      ]
    },
  ];
  return (
    <footer className="app-footer">
      <div className="app-footer__container container">
        <div className="app-footer__intro">
          <Link aria-label={t("GDS — Trang chủ", "GDS — Home")} className="app-footer__brand" to="/">
            <GdsBrand />
          </Link>
          <p className="app-footer__description">{t("Nâng tầm kiến thức của bạn với trí tuệ nhân tạo. Học mọi lúc, mọi nơi, theo phong cách của riêng bạn.", "Expand your knowledge with AI. Learn anywhere, anytime, in your own way.")}</p>
        </div>
        {footerGroups.map(group => (
          <div className="app-footer__group" key={group.title}>
            <h2 className="app-footer__group-title">{group.title}</h2>
            <ul className="app-footer__links">{group.links.map(link => <li key={link.path}>
              <Link className="app-footer__link" to={link.path}>{link.label}</Link>
            </li>)}</ul>
          </div>
        ))}
      </div>
      <div className="app-footer__copyright container">
        <p>© {new Date().getFullYear()} GDS. {t("Đã đăng ký bản quyền.", "All rights reserved.")}</p>
        <div aria-label={t("Đơn vị phát triển", "Development partner")} className="app-footer__developer-credit" role="group">
          <img alt="" aria-hidden="true" className="app-footer__developer-logo" decoding="async" height={48} src="/cns-logo.png" width={48} />
          <span>{t("Phát triển bởi Trung tâm an ninh công nghệ số - CNS", "Developed by CNS Digital Technology Security Center")}</span>
        </div>
      </div>
    </footer>
  );
}
