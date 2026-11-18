import { currentSystemLocale } from "../../platform/translate-system-message";
import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { usePlatform } from '../../platform/PlatformProvider';
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

const formatNumber = (value: number) => new Intl.NumberFormat(currentSystemLocale()).format(value);

export function AdminDashboardOverview({
  fullName,
  overview,
}: {
  fullName: string;
  overview: AdminOverviewData;
}) {
  const messageForUi = useSystemMessages();
  const { t } = usePlatform();
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
  const operationalSignals = getOperationalSignals(overview, t);

  return (
    <div className="admin-dashboard-home">
      <header className="admin-dashboard-home__header">
        <div>
          <p><SystemText message={"Xin chào,"} /> {fullName}</p>
          <h1><SystemText message={"Tổng quan nền tảng"} /></h1>
        </div>
        <span className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          <SystemText message={"Dữ liệu tổng hợp"} />
        </span>
      </header>

      <section className="admin-dashboard-metrics" aria-label={messageForUi("Chỉ số nền tảng")}>
        {primaryMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="admin-dashboard-metric" key={metric.label}>
              <span className="admin-dashboard-metric__icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <strong>{formatNumber(metric.value)}</strong>
                <p><SystemText message={metric.label} /></p>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-dashboard-home__grid">
        <section className="admin-dashboard-panel admin-dashboard-operations">
          <PanelHeader
            icon={ShieldAlert}
            title={messageForUi("Việc cần chú ý")}
            description={messageForUi("Tín hiệu được tính trực tiếp từ dữ liệu vận hành.")}
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
              <SystemText message={"Không có chỉ số vận hành nào cần chú ý."} />
            </p>
          )}
        </section>

        <section className="admin-dashboard-panel">
          <PanelHeader
            icon={Users}
            title={messageForUi("Phân bổ vai trò")}
            description={messageForUi("Số lượt gán vai trò hiện có trên nền tảng.")}
          />
          <dl className="admin-dashboard-breakdown">
            <MetricRow label={messageForUi("Học viên")} value={overview.roles.student} />
            <MetricRow label={messageForUi("Giảng viên")} value={overview.roles.instructor} />
            <MetricRow label={messageForUi("Quản trị viên")} value={overview.roles.platformAdmin} />
          </dl>
        </section>
      </div>

      <section className="admin-dashboard-panel">
        <PanelHeader
          icon={Bot}
          title={messageForUi("Hoạt động hệ thống")}
          description={messageForUi("Các tổng số giúp theo dõi mức sử dụng chính.")}
        />
        <div className="admin-dashboard-activity">
          <ActivityMetric icon={Bot} label={messageForUi("Tin nhắn AI")} value={overview.aiUsage.messages} />
          <ActivityMetric
            icon={MessageSquareText}
            label={messageForUi("Bài viết cộng đồng")}
            value={overview.community.posts}
          />
          <ActivityMetric
            icon={Library}
            label={messageForUi("Tài nguyên thư viện")}
            value={overview.library.resources}
          />
          <ActivityMetric icon={Radio} label={messageForUi("Lớp trực tuyến")} value={overview.classrooms.total} />
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
      <dd>{formatNumber(value)}</dd>
    </div>
  );
}

function ActivityMetric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number }) {
  return (
    <article>
      <Icon aria-hidden="true" />
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </article>
  );
}

function getOperationalSignals(overview: AdminOverviewData, t: (vi: string, en: string) => string): OperationalSignal[] {
  return [
    { label: `${formatNumber(overview.users.suspended)} ${t("tài khoản bị tạm ngưng", "suspended accounts")}`, detail: t("Kiểm tra các giới hạn truy cập đang có hiệu lực.", "Review access restrictions currently in effect."), value: overview.users.suspended, tone: "attention" as const },
    { label: `${formatNumber(overview.users.inactive)} ${t("tài khoản chưa hoạt động", "inactive accounts")}`, detail: t("Theo dõi trạng thái kích hoạt tài khoản.", "Monitor account activation status."), value: overview.users.inactive, tone: "info" as const },
    { label: `${formatNumber(overview.courses.draft)} ${t("khóa học bản nháp", "draft courses")}`, detail: t("Nội dung chưa được xuất bản trên hệ thống.", "Content has not been published on the platform."), value: overview.courses.draft, tone: "info" as const },
    { label: `${formatNumber(overview.classrooms.live)} ${t("lớp đang diễn ra", "live classrooms")}`, detail: t("Phiên học trực tuyến hiện đang hoạt động.", "Online sessions are currently active."), value: overview.classrooms.live, tone: "live" as const },
    { label: `${formatNumber(overview.classrooms.scheduled)} ${t("lớp đã lên lịch", "scheduled classrooms")}`, detail: t("Phiên học trực tuyến đang chờ bắt đầu.", "Online sessions are waiting to start."), value: overview.classrooms.scheduled, tone: "info" as const },
  ].filter((signal) => signal.value > 0);
}
