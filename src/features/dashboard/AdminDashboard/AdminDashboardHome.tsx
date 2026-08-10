import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  dashboardService,
  getDashboardErrorMessage,
  type AdminOverviewData,
} from "../../../services/dashboard.service";
import { AdminDashboardOverview } from "./AdminDashboardOverview";

interface AdminDashboardHomeProps {
  fullName: string;
}

export function AdminDashboardHome({ fullName }: AdminDashboardHomeProps) {
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setOverview(await dashboardService.getAdminOverview());
    } catch (loadError) {
      setOverview(null);
      setError(getDashboardErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (isLoading) {
    return <AdminDashboardLoading />;
  }

  if (error || !overview) {
    return (
      <div className="admin-dashboard-home admin-dashboard-home--state">
        <section className="admin-dashboard-state" role="alert">
          <ShieldAlert aria-hidden="true" />
          <div>
            <h1>Chưa thể tải tổng quan quản trị</h1>
            <p>{error}</p>
          </div>
          <button onClick={() => void loadOverview()} type="button">
            Thử lại
          </button>
        </section>
      </div>
    );
  }

  return <AdminDashboardOverview fullName={fullName} overview={overview} />;
}

function AdminDashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải tổng quan quản trị"
      className="admin-dashboard-home admin-dashboard-loading"
    >
      <div className="admin-dashboard-loading__header" />
      <div className="admin-dashboard-loading__metrics">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-dashboard-loading__block" key={index} />
        ))}
      </div>
      <div className="admin-dashboard-loading__panel" />
    </div>
  );
}
