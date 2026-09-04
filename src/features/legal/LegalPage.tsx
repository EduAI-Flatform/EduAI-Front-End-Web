import { useEffect } from "react";
import { ArrowLeft, FileText, Phone, Scale, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getLegalSectionSummaries,
  HOTLINE_DISPLAY,
  HOTLINE_HREF,
  LegalContent,
  type LegalPageKind,
} from "./legal-content";
import "./LegalPage.css";

const PAGE_DETAILS = {
  terms: {
    title: "Điều khoản sử dụng",
    description:
      "Các quy tắc, giới hạn và trách nhiệm khi bạn sử dụng nền tảng học tập EduAI.",
    icon: Scale,
  },
  privacy: {
    title: "Chính sách bảo mật",
    description:
      "Thông tin EduAI xử lý, mục đích sử dụng và cách bạn gửi yêu cầu về dữ liệu.",
    icon: FileText,
  },
  "data-deletion": {
    title: "Yêu cầu xóa dữ liệu",
    description:
      "Hướng dẫn thu hồi quyền đăng nhập xã hội và gửi yêu cầu xóa tài khoản, dữ liệu EduAI.",
    icon: ShieldCheck,
  },
} as const;

export function TermsPage() {
  return <LegalPage kind="terms" />;
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}

export function DataDeletionPage() {
  return <LegalPage kind="data-deletion" />;
}

function LegalPage({ kind }: { kind: LegalPageKind }) {
  const details = PAGE_DETAILS[kind];
  const Icon = details.icon;
  const titleId = "legal-" + kind + "-title";
  const introId = "legal-" + kind + "-intro";
  const tocId = "legal-" + kind + "-toc";
  const sections = getLegalSectionSummaries(kind);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = details.title + " | EduAI";

    return () => {
      document.title = previousTitle;
    };
  }, [details.title]);

  return (
    <article
      aria-describedby={introId}
      aria-labelledby={titleId}
      className="legal-page"
    >
      <div className="legal-page__container container">
        <Link className="legal-page__back" to="/">
          <ArrowLeft aria-hidden="true" />
          Về EduAI
        </Link>

        <header className="legal-page__header">
          <span className="legal-page__icon" aria-hidden="true">
            <Icon />
          </span>
          <div>
            <p className="legal-page__eyebrow">EduAI · Thông tin công khai</p>
            <h1 id={titleId}>{details.title}</h1>
            <p className="legal-page__updated">Cập nhật lần cuối: 04/09/2026</p>
          </div>
        </header>

        <p className="legal-page__intro" id={introId}>
          {details.description}
        </p>

        <nav className="legal-page__toc" aria-labelledby={tocId}>
          <h2 id={tocId}>Mục lục</h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={"#" + section.id + "-section"}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <LegalContent kind={kind} />

        <aside
          className="legal-page__contact"
          aria-labelledby="legal-contact-title"
        >
          <Phone aria-hidden="true" />
          <div>
            <h2 id="legal-contact-title">Liên hệ về pháp lý và dữ liệu</h2>
            <p>
              Gọi hotline công khai để gửi hoặc theo dõi yêu cầu về tài khoản,
              quyền riêng tư hoặc dữ liệu.
            </p>
            <a href={HOTLINE_HREF}>{HOTLINE_DISPLAY}</a>
            <a
              href="https://giaoducso.org.vn/"
              rel="noreferrer"
              target="_blank"
            >
              Cổng thông tin giáo dục số
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}
