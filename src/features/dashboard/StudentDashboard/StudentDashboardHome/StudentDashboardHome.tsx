import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AiHubSection } from "./AiHubSection/AiHubSection";
import { CertificatesSection } from "./CertificatesSection/CertificatesSection";
import { LearningAnalyticsSection } from "./DashboardPanels/LearningAnalyticsSection";
import { UpcomingClassesSection } from "./DashboardPanels/UpcomingClassesSection";
import { HeroSection } from "./HeroSection/HeroSection";
import { LearningCoursesSection } from "./LearningCoursesSection/LearningCoursesSection";
import "./StudentDashboardHome.css";

interface StudentDashboardHomeProps {
  firstName: string;
}

export function StudentDashboardHome({ firstName }: StudentDashboardHomeProps) {
  return (
    <div className="student-dashboard__shell container">
      <HeroSection firstName={firstName} />
      <LearningCoursesSection />

      <div className="student-dashboard__grid">
        <UpcomingClassesSection />
        <LearningAnalyticsSection />
      </div>

      <AiHubSection />
      <CertificatesSection />

      <Link className="student-dashboard__fab" to="/ai" aria-label="Mở trợ lý AI">
        <Sparkles aria-hidden="true" />
      </Link>
    </div>
  );
}
