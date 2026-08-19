import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BenefitAccessSection } from "../../../../components/learning/BenefitAccessSection";
import {
  dashboardService,
  getDashboardErrorMessage,
  type StudentDashboardData,
} from "../../../../services/dashboard.service";
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
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDashboard(await dashboardService.getStudentDashboard());
    } catch (loadError) {
      setDashboard(null);
      setError(getDashboardErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Đang tải bảng điều khiển học viên"
        className="student-dashboard__shell container"
      >
        <div className="student-dashboard-home__state">
          Đang tải dữ liệu học tập...
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="student-dashboard__shell container">
        <div className="student-dashboard-home__state" role="alert">
          <h1>Chưa thể tải bảng điều khiển</h1>
          <p>{error}</p>
          <button onClick={() => void loadDashboard()} type="button">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard__shell container">
      <HeroSection
        continueCourse={dashboard.continueCourse}
        firstName={firstName}
      />
      <LearningCoursesSection courses={dashboard.activeCourses} />

      <BenefitAccessSection />

      <div className="student-dashboard__grid">
        <UpcomingClassesSection sessions={dashboard.upcomingSessions} />
        <LearningAnalyticsSection
          statistics={dashboard.statistics}
          weeklyMinutes={dashboard.weeklyCompletedMinutes}
        />
      </div>

      <AiHubSection />
      <CertificatesSection certificates={dashboard.certificates} />

      <Link className="student-dashboard__fab" to="/ai" aria-label="Mở trợ lý AI">
        <Sparkles aria-hidden="true" />
      </Link>
    </div>
  );
}
