import { currentSystemLocale } from "../../../../platform/translate-system-message";
import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { Code2, Mail } from "lucide-react";
import { UserSkill } from "../../../../../services/profile.service";
import type { DashboardActivity } from "../../../../../services/dashboard.service";
import "./ProfileSidebarPanels.css";

interface ProfileSkillsPanelProps {
  isLoading: boolean;
  skills: UserSkill[];
}

interface ProfileConnectionsPanelProps {
  email?: string;
  websiteUrl?: string | null;
}

export function ProfileSkillsPanel({ isLoading, skills }: ProfileSkillsPanelProps) {
  return (
    <section className="student-profile-card student-profile-side-card">
      <h2><SystemText message={"Kỹ năng chuyên môn"} /></h2>
      {isLoading ? (
        <div className="student-profile-skeleton"><SystemText message={"Đang tải kỹ năng..."} /></div>
      ) : skills.length > 0 ? (
        <div className="student-profile-skills">
          {skills.map((skill, index) => (
            <span
              className={`student-profile-skill student-profile-skill--${index % 3}`}
              key={skill.id}
            >
              {skill.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="student-profile-empty" role="status">
          <SystemText message={"Chưa cập nhật kỹ năng."} />
        </p>
      )}
    </section>
  );
}

export function ProfileHistoryPanel({
  activities,
  isLoading,
}: {
  activities: DashboardActivity[];
  isLoading: boolean;
}) {
  const messageForUi = useSystemMessages();
  return (
    <section className="student-profile-card student-profile-side-card">
      <h2><SystemText message={"Lịch sử học tập"} /></h2>
      {isLoading ? (
        <div className="student-profile-skeleton"><SystemText message={"Đang tải lịch sử..."} /></div>
      ) : activities.length > 0 ? (
        <div className="student-profile-history">
        {activities.map((item, index) => (
          <article className="student-profile-history__item" key={item.id}>
            <span
              className={`student-profile-history__dot student-profile-history__dot--${
                index % 2 === 0 ? "primary" : "secondary"
              }`}
            />
            <p>{new Intl.DateTimeFormat(currentSystemLocale()).format(new Date(item.occurredAt))}</p>
            <h3>{item.title}</h3>
            <span>
              {item.courseTitle ?? <SystemText message={"Hoạt động học tập"} />}
              {item.score === null ? "" : ` · ${item.score}${messageForUi(" điểm")}`}
            </span>
          </article>
        ))}
        </div>
      ) : (
        <p className="student-profile-empty" role="status">
          <SystemText message={"Chưa có hoạt động học tập."} />
        </p>
      )}
    </section>
  );
}

export function ProfileConnectionsPanel({
  email,
  websiteUrl,
}: ProfileConnectionsPanelProps) {
  const connections = [
    {
      icon: Mail,
      label: "Email",
      value: email ?? "Chưa cập nhật",
      tone: "primary",
    },
    {
      icon: Code2,
      label: "Website",
      value: websiteUrl ?? "Thêm website cá nhân",
      tone: "secondary",
    },
  ];

  return (
    <section className="student-profile-card student-profile-side-card">
      <h2><SystemText message={"Kết nối"} /></h2>
      <div className="student-profile-connections">
        {connections.map((connection) => {
          const Icon = connection.icon;

          return (
            <article className="student-profile-connection" key={connection.label}>
              <span className={`student-profile-connection__icon student-profile-connection__icon--${connection.tone}`}>
                <Icon aria-hidden="true" />
              </span>
              <div>
                <h3>{connection.label}</h3>
                <p>{connection.value}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
