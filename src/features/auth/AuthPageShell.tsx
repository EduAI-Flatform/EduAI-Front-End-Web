import { SystemText } from '@/features/platform/SystemText';
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { GdsBrand } from "../../components/brand/GdsBrand";
import { usePlatform } from "../platform/PlatformProvider";
import "./AuthPageShell.css";

interface AuthPageShellProps {
  children: ReactNode;
  description: string;
  mode: "login" | "register";
  title: string;
}

export function AuthPageShell({
  children,
  description,
  mode,
  title,
}: AuthPageShellProps) {
  const isRegister = mode === "register";
  const { t } = usePlatform();

  return (
    <section className="auth-shell">
      <div className="auth-shell__grid">
        <aside
          className={`auth-visual ${
            isRegister ? "auth-visual--register" : "auth-visual--login"
          }`}
        >
          {!isRegister ? (
            <div className="auth-visual__intro">
              <h2 className="auth-visual__headline">
                {t("Học tập thông minh cùng AI", "Learn smarter with AI")}
              </h2>
              <p className="auth-visual__copy">
                {t("Khám phá lộ trình học tập cá nhân hóa và sự hỗ trợ từ trợ lý AI thế hệ mới.", "Explore personalized learning paths with support from your AI assistant.")}
              </p>
            </div>
          ) : null}

          <div className="auth-visual__frame">
            <LearningIllustration />
          </div>

          {isRegister ? (
            <div className="auth-visual__register-copy">
              <h2>{t("Khám phá tương lai của giáo dục", "Discover the future of education")}</h2>
              <p>
                {t("Tham gia cùng học viên và giảng viên đang ứng dụng AI để tối ưu hóa lộ trình học tập mỗi ngày.", "Join learners and educators using AI to improve their learning every day.")}
              </p>
              <div className="auth-chip-row">
                <span className="auth-chip">
                  <Sparkles aria-hidden="true" className="auth-chip__icon" />
                  <SystemText message={"Gia sư AI 24/7"} />
                </span>
                <span className="auth-chip">
                  <GraduationCap
                    aria-hidden="true"
                    className="auth-chip__icon"
                  />
                  {t("Chứng chỉ quốc tế", "International certificates")}
                </span>
              </div>
            </div>
          ) : null}

          <p className="auth-visual__footer">
            © {new Date().getFullYear()} GDS. {t("Học tập không giới hạn.", "Learn without limits.")}
          </p>
        </aside>

        <div
          className={`auth-form-panel ${
            isRegister ? "auth-form-panel--register" : "auth-form-panel--login"
          }`}
        >
          <div className="auth-form-panel__content">
            <Link className="auth-brand" to="/">
              <GdsBrand />
            </Link>

            <div className="auth-title-row">
              <Link
                aria-label={t("Quay về trang chủ", "Back to home")}
                className="auth-back-link"
                to="/"
              >
                <ArrowLeft aria-hidden="true" className="auth-back-link__icon" />
              </Link>
              <h1 className="auth-title">{title}</h1>
            </div>
            <p className="auth-description">{description}</p>

            <div className="auth-form-slot">{children}</div>
          </div>

          {!isRegister ? (
            <footer className="auth-form-footer">
              <span>© 2026 GDS.</span>
            </footer>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LearningIllustration() {
  return (
    <div className="auth-illustration">
      <div className="auth-illustration__cube-one" />
      <div className="auth-illustration__circle" />
      <div className="auth-illustration__cube-two" />

      <div className="auth-illustration__dashboard">
        <div className="auth-illustration__window-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-illustration__metric-grid">
          {["AI", "RAG", "LMS"].map((item) => (
            <div className="auth-illustration__metric" key={item}>
              {item}
            </div>
          ))}
        </div>
        <div className="auth-illustration__progress">
          <div className="auth-illustration__progress-fill" />
        </div>
      </div>

      <div className="auth-illustration__bot">
        <div className="auth-illustration__bot-head">
          <Bot aria-hidden="true" className="auth-illustration__bot-icon" />
        </div>
        <div className="auth-illustration__bot-body" />
      </div>

      <div className="auth-illustration__seat-left" />
      <div className="auth-illustration__seat-right" />

      <div className="auth-illustration__nodes">
        <span />
        <span />
        <span />
      </div>

      <div className="auth-illustration__badge">
        <CheckCircle2
          aria-hidden="true"
          className="auth-illustration__badge-icon"
        />
        <SystemText message={"Lộ trình cá nhân hóa"} />
      </div>
    </div>
  );
}
