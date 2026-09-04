import { Link } from "react-router-dom";
import "./footer.css";

const cnsDeveloperCredit =
  "Phát triển bởi Trung tâm an ninh công nghệ số - CNS";

const footerGroups = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Khóa học", path: "/courses" },
      { label: "Tính năng AI", path: "/ai" },
    ],
  },
  {
    title: "Học tập",
    links: [
      { label: "Thư viện", path: "/library" },
      { label: "Chứng chỉ", path: "/verify" },
    ],
  },
  {
    title: "Cộng đồng",
    links: [
      { label: "Tham gia cộng đồng", path: "/community" },
    ],
  },
  {
    title: "Ph\u00e1p l\u00fd",
    links: [
      { label: "Điều khoản sử dụng", path: "/terms" },
      { label: "Ch\u00ednh s\u00e1ch b\u1ea3o m\u1eadt", path: "/privacy" },
      { label: "Y\u00eau c\u1ea7u x\u00f3a d\u1eef li\u1ec7u", path: "/data-deletion" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__container container">
        <div className="app-footer__intro">
          <Link className="app-footer__brand" to="/">
            EduAI
          </Link>
          <p className="app-footer__description">
            Nâng tầm kiến thức của bạn với trí tuệ nhân tạo. Học mọi lúc, mọi
            nơi, theo phong cách của riêng bạn.
          </p>
        </div>

        {footerGroups.map((group) => (
          <div className="app-footer__group" key={group.title}>
            <h2 className="app-footer__group-title">{group.title}</h2>
            <ul className="app-footer__links">
              {group.links.map((link) => (
                <li key={link.path}>
                  <Link className="app-footer__link" to={link.path}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="app-footer__copyright container">
        <p>© 2026 EduAI. Đã đăng ký bản quyền.</p>
        <div
          aria-label="Đơn vị phát triển"
          className="app-footer__developer-credit"
          role="group"
        >
          <img
            alt=""
            aria-hidden="true"
            className="app-footer__developer-logo"
            decoding="async"
            height={48}
            src="/cns-logo.png"
            width={48}
          />
          <span>{cnsDeveloperCredit}</span>
        </div>
      </div>
    </footer>
  );
}
