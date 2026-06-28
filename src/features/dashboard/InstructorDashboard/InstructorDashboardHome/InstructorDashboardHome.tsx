import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { InstructorAiToolsSection } from "./InstructorAiToolsSection/InstructorAiToolsSection";
import { InstructorHeroSection } from "./InstructorHeroSection/InstructorHeroSection";
import { InstructorMetricsSection } from "./InstructorMetricsSection/InstructorMetricsSection";
import { InstructorQueuesSection } from "./InstructorQueuesSection/InstructorQueuesSection";
import "./InstructorDashboardHome.css";

interface InstructorDashboardHomeProps {
  firstName: string;
}

export function InstructorDashboardHome({ firstName }: InstructorDashboardHomeProps) {
  return (
    <div className="instructor-dashboard-home__shell">
      <InstructorHeroSection firstName={firstName} />
      <InstructorMetricsSection />

      <div className="instructor-dashboard-home__grid">
        <InstructorQueuesSection />
        <InstructorAiToolsSection />
      </div>

      <Link
        aria-label="Mở trợ lý AI"
        className="instructor-dashboard-home__fab"
        to="/instructor/dashboard/ai"
      >
        <Sparkles aria-hidden="true" />
      </Link>
    </div>
  );
}
