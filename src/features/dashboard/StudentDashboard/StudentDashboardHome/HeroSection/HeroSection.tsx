import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import "./HeroSection.css";

interface HeroSectionProps {
  firstName: string;
}

export function HeroSection({ firstName }: HeroSectionProps) {
  return (
    <section className="student-dashboard__hero">
      <div className="student-dashboard__hero-pattern" />
      <div className="student-dashboard__hero-content">
        <div>
          <h1>Xin chào {firstName}</h1>
          <p>
            Chào mừng bạn quay trở lại. Bạn đang làm rất tốt, hãy tiếp tục hành trình chinh
            phục tri thức AI hôm nay.
          </p>
        </div>

        <article className="student-dashboard__continue-card">
          <p>Tiếp tục học</p>
          <h2>React Advanced</h2>
          <div className="student-dashboard__progress">
            <span style={{ width: "68%" }} />
          </div>
          <div className="student-dashboard__continue-footer">
            <span>68% hoàn thành</span>
            <Link to="/learning">Tiếp tục học</Link>
          </div>
        </article>
      </div>
      <div className="student-dashboard__hero-orb" aria-hidden="true">
        <Sparkles className="student-dashboard__hero-orb-icon" />
      </div>
    </section>
  );
}
