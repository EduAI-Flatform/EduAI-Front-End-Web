import { Code2, Mail, Network, UserRound } from "lucide-react";
import { UserSkill } from "../../../../../services/profile.service";
import { fallbackSkills, learningHistory } from "../profilePageData";
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
  const visibleSkills = skills.length > 0 ? skills : fallbackSkills;

  return (
    <section className="student-profile-card student-profile-side-card">
      <h2>Kỹ năng chuyên môn</h2>
      {isLoading ? (
        <div className="student-profile-skeleton">Đang tải kỹ năng...</div>
      ) : (
        <div className="student-profile-skills">
          {visibleSkills.map((skill, index) => (
            <span
              className={`student-profile-skill student-profile-skill--${index % 3}`}
              key={skill.id}
            >
              {skill.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProfileHistoryPanel() {
  return (
    <section className="student-profile-card student-profile-side-card">
      <h2>Lịch sử học tập</h2>
      <div className="student-profile-history">
        {learningHistory.map((item) => (
          <article className="student-profile-history__item" key={item.title}>
            <span className={`student-profile-history__dot student-profile-history__dot--${item.tone}`} />
            <p>{item.time}</p>
            <h3>{item.title}</h3>
            <span>{item.description}</span>
          </article>
        ))}
      </div>
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
    {
      icon: Network,
      label: "Cộng đồng",
      value: "EduAI Learning Network",
      tone: "success",
    },
  ];

  return (
    <section className="student-profile-card student-profile-side-card">
      <h2>Kết nối</h2>
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
