import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText } from "../platform/SystemText";
import { useEffect, useState } from "react";
import { Award, BriefcaseBusiness, CheckCircle2, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  getProfileErrorMessage,
  profileService,
  type PublicCareerProfile,
} from "../../services/profile.service";
import "./PublicCareerProfilePage.css";

const availabilityLabels: Record<string, string> = {
  not_looking: "Chưa tìm cơ hội",
  open_to_opportunities: "Sẵn sàng trao đổi",
  actively_looking: "Đang chủ động tìm việc",
};

export function PublicCareerProfilePage() {
  const { publicSlug = "" } = useParams();
  const [profile, setProfile] = useState<PublicCareerProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    profileService.getPublicCareerProfile(publicSlug)
      .then((result) => { if (active) setProfile(result); })
      .catch((loadError) => { if (active) setError(getProfileErrorMessage(loadError)); });
    return () => { active = false; };
  }, [publicSlug]);

  if (error) {
    return <main className="public-career public-career--state"><h1><SystemText message={"Không tìm thấy hồ sơ"} /></h1><p><SystemText message={"Hồ sơ này đang riêng tư hoặc không tồn tại."} /></p><Link to="/courses"><SystemText message="Khám phá khóa học" /></Link></main>;
  }
  if (!profile) {
    return <main className="public-career public-career--state" aria-busy="true"><p><SystemText message={"Đang tải hồ sơ nghề nghiệp…"} /></p></main>;
  }

  return (
    <main className="public-career container">
      <header className="public-career__hero">
        <div className="public-career__avatar" aria-hidden="true">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.fullName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="public-career__eyebrow"><SystemText message={"Hồ sơ được EduAI xác minh"} /></p>
          <h1>{profile.fullName}</h1>
          {profile.headline ? <p className="public-career__headline">{profile.headline}</p> : null}
          <div className="public-career__meta">
            {profile.location ? <span><MapPin aria-hidden="true" />{profile.location}</span> : null}
            {profile.availabilityStatus ? <span><BriefcaseBusiness aria-hidden="true" /><SystemText message={availabilityLabels[profile.availabilityStatus]} /></span> : null}
          </div>
        </div>
      </header>

      <div className="public-career__grid">
        <div className="public-career__main">
          {profile.careerGoal ? <section><h2><SystemText message={"Mục tiêu nghề nghiệp"} /></h2><p>{profile.careerGoal}</p></section> : null}
          {profile.portfolio.length ? <section><h2><SystemText message={"Dự án nổi bật"} /></h2><div className="public-career__items">{profile.portfolio.map((item) => <article key={`${item.title}-${item.projectUrl}`}><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}{item.projectUrl ? <a href={item.projectUrl} target="_blank" rel="noreferrer"><SystemText message={"Xem dự án"} /></a> : null}</article>)}</div></section> : null}
          <section><h2><SystemText message={"Thành tựu học tập"} /></h2><div className="public-career__items">{profile.completedCourses.map((course) => <article key={course.slug}><CheckCircle2 aria-hidden="true" /><div><h3>{course.title}</h3><p><SystemText message={"Hoàn thành"} /> <SystemValue render={() => (new Date(course.completedAt).toLocaleDateString(currentSystemLocale()))} /></p></div></article>)}{profile.certificates.map((certificate) => <article key={`${certificate.title}-${certificate.issuedAt}`}><Award aria-hidden="true" /><div><h3>{certificate.title}</h3><p>{certificate.courseTitle}</p></div></article>)}</div></section>
        </div>
        <aside className="public-career__side">
          <section><h2><SystemText message={"Vai trò quan tâm"} /></h2><div className="public-career__tags">{profile.preferredRoles.map((role) => <span key={role}>{role}</span>)}</div></section>
          <section><h2><SystemText message="Kỹ năng" /></h2><div className="public-career__tags">{profile.skills.map((skill) => <span key={`${skill.name}-${skill.level}`}>{skill.name}</span>)}</div></section>
          {profile.websiteUrl ? <a className="public-career__website" href={profile.websiteUrl} target="_blank" rel="noreferrer"><SystemText message={"Website cá nhân"} /></a> : null}
        </aside>
      </div>
    </main>
  );
}
