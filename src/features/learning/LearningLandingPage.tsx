import { BookOpen, BrainCircuit, GraduationCap, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../auth/auth-store";
import { usePlatform } from "../platform/PlatformProvider";
import "./LearningLandingPage.css";

export function LearningLandingPage() {
  const session = useAuthSession();
  const { t } = usePlatform();
  return (
    <section className="learning-landing container">
      <header className="learning-landing__hero">
        <span>{t("KHÔNG GIAN HỌC TẬP", "LEARNING SPACE")}</span>
        <h1>{t("Học tập cùng GDS", "Learn with GDS")}</h1>
        <p>{t("Khám phá khóa học, xây dựng lộ trình và tiếp tục hành trình học tập theo mục tiêu của bạn.", "Explore courses, create a learning path and continue learning at your own pace.")}</p>
      </header>
      <div className="learning-landing__grid">
        <article><BookOpen aria-hidden="true" /><h2>{t("Khám phá khóa học", "Explore courses")}</h2><p>{t("Tìm khóa học phù hợp với nhu cầu.", "Discover courses that suit your goals.")}</p><Link to="/courses">{t("Xem khóa học", "View courses")}</Link></article>
        <article><GraduationCap aria-hidden="true" /><h2>{t("Việc học của tôi", "My learning")}</h2><p>{t("Quản lý các khóa học đã đăng ký.", "Manage your enrolled courses.")}</p><Link to={session ? "/dashboard/learning" : "/login"}>{session ? t("Tiếp tục học", "Continue learning") : t("Đăng nhập", "Sign in")}</Link></article>
        <article><Route aria-hidden="true" /><h2>{t("Lộ trình học tập AI", "AI learning path")}</h2><p>{t("Xác định mục tiêu và theo dõi lộ trình cá nhân.", "Set your goals and track your learning path.")}</p><Link to={session ? "/dashboard/learning-path" : "/login"}>{session ? t("Xem lộ trình", "View learning path") : t("Đăng nhập", "Sign in")}</Link></article>
        <article><BrainCircuit aria-hidden="true" /><h2>{t("Trợ lý học tập AI", "AI learning assistant")}</h2><p>{t("Đặt câu hỏi và khám phá kiến thức cùng GDS.", "Ask questions and explore knowledge with GDS.")}</p><Link to={session ? "/ai" : "/login"}>{t("Khám phá AI", "Explore AI")}</Link></article>
      </div>
    </section>
  );
}
