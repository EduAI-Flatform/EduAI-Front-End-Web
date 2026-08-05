import { Globe2, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import "./footer.css";

const footerGroups = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Khóa học", path: "/courses" },
      { label: "Tính năng AI", path: "/ai" },
      { label: "Bảng giá", path: "/pricing" },
    ],
  },
  {
    title: "Công ty",
    links: [
      { label: "Giới thiệu", path: "/about" },
      { label: "Cộng đồng", path: "/community" },
      { label: "Liên hệ", path: "/contact" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { label: "Điều khoản", path: "/terms" },
      { label: "Bảo mật", path: "/privacy" },
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
          <div className="app-footer__socials">
            <a aria-label="Ngôn ngữ" className="app-footer__social-link" href="/language">
              <Languages aria-hidden="true" className="app-footer__social-icon" />
            </a>
            <a
              aria-label="Trang toàn cầu"
              className="app-footer__social-link"
              href="/global"
            >
              <Globe2 aria-hidden="true" className="app-footer__social-icon" />
            </a>
          </div>
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

        <div className="app-footer__newsletter">
          <h2 className="app-footer__group-title">Bản tin</h2>
          <form className="app-footer__form">
            <label className="sr-only" htmlFor="footer-email">
              Email của bạn
            </label>
            <input
              className="app-footer__input"
              id="footer-email"
              placeholder="Email của bạn"
              type="email"
            />
            <button className="app-footer__submit" type="submit">
              Đăng ký
            </button>
          </form>
        </div>
      </div>
      <div className="app-footer__copyright container">
        <p>© 2026 EduAI. Đã đăng ký bản quyền.</p>
      </div>
    </footer>
  );
}
