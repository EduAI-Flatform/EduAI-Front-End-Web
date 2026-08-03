import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  dashboardService,
  getDashboardErrorMessage,
  type InstructorDashboardData,
} from "../../../../services/dashboard.service";
import { InstructorAiToolsSection } from "./InstructorAiToolsSection/InstructorAiToolsSection";
import { InstructorHeroSection } from "./InstructorHeroSection/InstructorHeroSection";
import { InstructorMetricsSection } from "./InstructorMetricsSection/InstructorMetricsSection";
import { InstructorQueuesSection } from "./InstructorQueuesSection/InstructorQueuesSection";
import "./InstructorDashboardHome.css";

interface InstructorDashboardHomeProps {
  firstName: string;
}

export function InstructorDashboardHome({ firstName }: InstructorDashboardHomeProps) {
  const [dashboard, setDashboard] = useState<InstructorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDashboard(await dashboardService.getInstructorDashboard());
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
        aria-label="Đang tải bảng điều khiển giảng viên"
        className="instructor-dashboard-home__shell"
      >
        <div className="instructor-dashboard-home__state">
          Đang tải dữ liệu giảng dạy...
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="instructor-dashboard-home__shell">
        <div className="instructor-dashboard-home__state" role="alert">
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
    <div className="instructor-dashboard-home__shell">
      <InstructorHeroSection
        firstName={firstName}
        statistics={dashboard.statistics}
      />
      <InstructorMetricsSection statistics={dashboard.statistics} />

      <div className="instructor-dashboard-home__grid">
        <InstructorQueuesSection queues={dashboard.workQueue} />
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
