import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../../auth/auth-store";
import "./AdminDashboard.css";

export function AdminDashboard() {
  const session = useAuthSession();

  return (
    <section className="admin-dashboard-placeholder">
      <header className="admin-dashboard-placeholder__header">
        <Link to="/">EduAI</Link>
        <span>
          <ShieldCheck aria-hidden="true" />
          Quản trị nền tảng
        </span>
      </header>

      <div className="admin-dashboard-placeholder__content">
        <span className="admin-dashboard-placeholder__eyebrow">Khu vực được bảo vệ</span>
        <h1>Xin chào, {session?.user.fullName ?? "quản trị viên"}</h1>
        <p>
          Bảng điều khiển quản trị chuyên biệt sẽ được triển khai trong Sprint 14
          sau khi API quản trị và phạm vi dữ liệu được hoàn tất.
        </p>
        <div className="admin-dashboard-placeholder__notice" role="status">
          Trang chờ này không hiển thị dữ liệu học viên hoặc số liệu giả lập.
        </div>
        <Link className="admin-dashboard-placeholder__back" to="/">
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
