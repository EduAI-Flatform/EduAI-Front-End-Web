import { CircleSlash2 } from "lucide-react";
import { Link } from "react-router-dom";
import "./DashboardRouteState.css";

export function DashboardRouteState({ backPath }: { backPath: string }) {
  return (
    <section className="dashboard-route-state" role="status">
      <CircleSlash2 aria-hidden="true" />
      <h1>Trang chưa khả dụng</h1>
      <p>Đường dẫn này chưa có nội dung phù hợp với vai trò của bạn.</p>
      <Link to={backPath}>Quay lại bảng điều khiển</Link>
    </section>
  );
}
