import { ChevronDown, ChevronUp, Globe2, Languages } from "lucide-react";
import { useState } from "react";
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(title: string) {
    setOpenGroups((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <footer className="app-footer">
      <div className="app-footer__container container">
        <div className="app-footer__intro">
          <Link className="app-footer__brand" to="/">
            EduAI
          </Link>
          <p className="app-footer__description app-footer__description--desktop">
            Nâng tầm kiến thức của bạn với trí tuệ nhân tạo. Học mọi lúc, mọi
            nơi, theo phong cách của riêng bạn.
          </p>
          <p className="app-footer__description app-footer__description--mobile">
            Học thông minh hơn cùng EduAI.
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
          <div className="app-footer__group app-footer__group--desktop" key={group.title}>
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

        <div aria-label="Footer di động" className="app-footer__mobile-groups" role="region">
          {footerGroups.map((group, index) => {
            const isOpen = Boolean(openGroups[group.title]);
            const linksId = `footer-mobile-links-${index}`;

            return (
              <div className="app-footer__mobile-group" key={group.title}>
                <button
                  aria-controls={linksId}
                  aria-expanded={isOpen}
                  className="app-footer__group-toggle"
                  onClick={() => toggleGroup(group.title)}
                  type="button"
                >
                  <span>{group.title}</span>
                  {isOpen ? (
                    <ChevronUp aria-hidden="true" className="app-footer__group-toggle-icon" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="app-footer__group-toggle-icon" />
                  )}
                </button>
                <ul
                  className="app-footer__links app-footer__links--mobile"
                  hidden={!isOpen}
                  id={linksId}
                >
                  {group.links.map((link) => (
                    <li key={link.path}>
                      <Link className="app-footer__link" to={link.path}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="app-footer__newsletter app-footer__newsletter--desktop">
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
