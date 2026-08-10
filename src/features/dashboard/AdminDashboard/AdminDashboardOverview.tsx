import {
  BadgeCheck,
  BookOpen,
  Bot,
  GraduationCap,
  Library,
  MessageSquareText,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminOverviewData } from "../../../services/dashboard.service";

interface OperationalSignal {
  label: string;
  detail: string;
  value: number;
  tone: "attention" | "info" | "live";
}

const numberFormatter = new Intl.NumberFormat("vi-VN");

export function AdminDashboardOverview({
  fullName,
  overview,
}: {
  fullName: string;
  overview: AdminOverviewData;
}) {
  const primaryMetrics = [
    { label: "Tài khoản", value: overview.users.total, icon: Users },
    { label: "Khóa học", value: overview.courses.total, icon: BookOpen },
    {
      label: "Ghi danh đang học",
      value: overview.enrollments.active,
      icon: GraduationCap,
    },
    {
      label: "Chứng chỉ đã cấp",
      value: overview.certificates.issued,
      icon: BadgeCheck,
    },
  ];
  const operationalSignals = getOperationalSignals(overview);

  return (
    <div className="admin-dashboard-home">
      <header className="admin-dashboard-home__header">
        <div>
          <p>Xin chào, {fullName}</p>
          <h1>Tổng quan nền tảng</h1>
        </div>
        <span className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          Dữ liệu tổng hợp
        </span>
      </header>

      <section className="admin-dashboard-metrics" aria-label="Chỉ số nền tảng">
        {primaryMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="admin-dashboard-metric" key={metric.label}>
              <span className="admin-dashboard-metric__icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <strong>{numberFormatter.format(metric.value)}</strong>
                <p>{metric.label}</p>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-dashboard-home__grid">
        <section className="admin-dashboard-panel admin-dashboard-operations">
          <PanelHeader
            icon={ShieldAlert}
            title="Việc cần chú ý"
            description="Tín hiệu được tính trực tiếp từ dữ liệu vận hành."
          />
          {operationalSignals.length > 0 ? (
            <div className="admin-dashboard-operations__list">
              {operationalSignals.map((signal) => (
                <article
                  className={`admin-dashboard-operation admin-dashboard-operation--${signal.tone}`}
                  key={signal.label}
                >
                  <strong>{signal.label}</strong>
                  <p>{signal.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-dashboard-operations__empty" role="status">
              Không có chỉ số vận hành nào cần chú ý.
            </p>
          )}
        </section>

        <section className="admin-dashboard-panel">
          <PanelHeader
            icon={Users}
            title="Phân bổ vai trò"
            description="Số lượt gán vai trò hiện có trên nền tảng."
          />
          <dl className="admin-dashboard-breakdown">
            <MetricRow label="Học viên" value={overview.roles.student} />
            <MetricRow label="Giảng viên" value={overview.roles.instructor} />
            <MetricRow label="Quản trị viên" value={overview.roles.platformAdmin} />
          </dl>
        </section>
      </div>

      <section className="admin-dashboard-panel">
        <PanelHeader
          icon={Bot}
          title="Hoạt động hệ thống"
          description="Các tổng số giúp theo dõi mức sử dụng chính."
        />
        <div className="admin-dashboard-activity">
          <ActivityMetric icon={Bot} label="Tin nhắn AI" value={overview.aiUsage.messages} />
          <ActivityMetric
            icon={MessageSquareText}
            label="Bài viết cộng đồng"
            value={overview.community.posts}
          />
          <ActivityMetric
            icon={Library}
            label="Tài nguyên thư viện"
            value={overview.library.resources}
          />
          <ActivityMetric icon={Radio} label="Lớp trực tuyến" value={overview.classrooms.total} />
        </div>
      </section>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
}) {
  return (
    <div className="admin-dashboard-panel__header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Icon aria-hidden="true" />
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{numberFormatter.format(value)}</dd>
    </div>
  );
}

function ActivityMetric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number }) {
  return (
    <article>
      <Icon aria-hidden="true" />
      <strong>{numberFormatter.format(value)}</strong>
      <span>{label}</span>
    </article>
  );
}

function getOperationalSignals(overview: AdminOverviewData): OperationalSignal[] {
  return [
    { label: `${numberFormatter.format(overview.users.suspended)} tài khoản bị tạm ngưng`, detail: "Kiểm tra các giới hạn truy cập đang có hiệu lực.", value: overview.users.suspended, tone: "attention" as const },
    { label: `${numberFormatter.format(overview.users.inactive)} tài khoản chưa hoạt động`, detail: "Theo dõi trạng thái kích hoạt tài khoản.", value: overview.users.inactive, tone: "info" as const },
    { label: `${numberFormatter.format(overview.courses.draft)} khóa học bản nháp`, detail: "Nội dung chưa được xuất bản trên hệ thống.", value: overview.courses.draft, tone: "info" as const },
    { label: `${numberFormatter.format(overview.classrooms.live)} lớp đang diễn ra`, detail: "Phiên học trực tuyến hiện đang hoạt động.", value: overview.classrooms.live, tone: "live" as const },
    { label: `${numberFormatter.format(overview.classrooms.scheduled)} lớp đã lên lịch`, detail: "Phiên học trực tuyến đang chờ bắt đầu.", value: overview.classrooms.scheduled, tone: "info" as const },
  ].filter((signal) => signal.value > 0);
}
