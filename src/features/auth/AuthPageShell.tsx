import { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
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
                Học tập thông minh cùng AI
              </h2>
              <p className="auth-visual__copy">
                Khám phá lộ trình học tập cá nhân hóa và sự hỗ trợ từ trợ lý AI
                thế hệ mới.
              </p>
            </div>
          ) : null}

          <div className="auth-visual__frame">
            <LearningIllustration />
          </div>

          {isRegister ? (
            <div className="auth-visual__register-copy">
              <h2>Khám phá tương lai của giáo dục</h2>
              <p>
                Tham gia cùng học viên và giảng viên đang ứng dụng AI để tối ưu hóa
                lộ trình học tập mỗi ngày.
              </p>
              <div className="auth-chip-row">
                <span className="auth-chip">
                  <Sparkles aria-hidden="true" className="auth-chip__icon" />
                  AI Tutor 24/7
                </span>
                <span className="auth-chip">
                  <GraduationCap
                    aria-hidden="true"
                    className="auth-chip__icon"
                  />
                  Chứng chỉ quốc tế
                </span>
              </div>
            </div>
          ) : null}

          <p className="auth-visual__footer">
            © 2024 AILearn. Built for the Future of Education.
          </p>
        </aside>

        <div
          className={`auth-form-panel ${
            isRegister ? "auth-form-panel--register" : "auth-form-panel--login"
          }`}
        >
          <div className="auth-form-panel__content">
            <Link className="auth-brand" to="/">
              <span className="auth-brand__mark">
                {isRegister ? (
                  <GraduationCap
                    aria-hidden="true"
                    className="auth-brand__icon"
                  />
                ) : (
                  <BrainCircuit
                    aria-hidden="true"
                    className="auth-brand__icon"
                  />
                )}
              </span>
              AILearn
            </Link>

            <h1 className="auth-title">{title}</h1>
            <p className="auth-description">{description}</p>

            <div className="auth-form-slot">{children}</div>
          </div>

          <footer className="auth-form-footer">
            <span>© 2024 AILearn.</span>
            <div className="auth-form-footer__links">
              <a className="auth-form-footer__link" href="/privacy">
                Privacy
              </a>
              <a className="auth-form-footer__link" href="/terms">
                Terms
              </a>
              <a className="auth-form-footer__link" href="/support">
                Support
              </a>
            </div>
          </footer>
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
        Personalized path
      </div>
    </div>
  );
}
