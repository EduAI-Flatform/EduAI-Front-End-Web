import { SystemText } from '@/features/platform/SystemText';
import certificateImage from "@/assets/gds-certificate-preview.svg";
import { ArrowRight, Bot, CheckCircle2, ChevronLeft, ChevronRight, FileText, HelpCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BenefitAccessSection } from "../../components/learning/BenefitAccessSection";
import { courseService, getCourseErrorMessage, type CourseSummary } from "../../services/course.service";
import { CourseCard } from "../courses/CourseCard/CourseCard";
import { sortFeaturedCourses } from "../courses/course-display";
import { usePlatform } from "../platform/PlatformProvider";
import "./HomePage.css";

export function HomePage() {
  const { settings, locale, t } = usePlatform();
  const [featuredCourses, setFeaturedCourses] = useState<CourseSummary[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const featuredCoursesRef = useRef<HTMLDivElement>(null);
  const aiFeatures = [
    { title: t("Gia sư AI", "AI tutor"), description: t("Hỏi đáp nội dung học tập 24/7 với trợ lý hiểu ngữ cảnh và hỗ trợ như một giảng viên đồng hành.", "Get contextual learning support around the clock with your AI tutor."), icon: Bot, tone: "primary", to: "/ai" },
    { title: t("Tóm tắt AI", "AI summaries"), description: t("Chuyển bài giảng dài thành những ý chính súc tích để bạn nắm kiến thức nhanh hơn.", "Turn long lessons into concise key points to understand concepts faster."), icon: FileText, tone: "secondary", to: "/ai/tools" },
    { title: t("Tạo quiz bằng AI", "AI quizzes"), description: t("Tạo câu hỏi từ tài liệu học tập và kiểm tra mức độ hiểu bài ngay sau mỗi chương.", "Create questions from learning materials and check understanding after each chapter."), icon: HelpCircle, tone: "primary", to: "/ai/tools" },
    { title: t("Flashcard AI", "AI flashcards"), description: t("Ôn tập bằng flashcard theo lộ trình lặp lại ngắt quãng phù hợp với tiến độ của bạn.", "Review with flashcards and spaced repetition tailored to your progress."), icon: Sparkles, tone: "secondary", to: "/ai/tools" },
  ];
  const certificateBenefits = [
    t("Chứng chỉ xác thực bằng QR Code", "QR-verified certificates"),
    t("Mã chứng chỉ duy nhất để tra cứu", "A unique certificate verification code"),
    t("Dễ dàng chia sẻ lên LinkedIn", "Easy sharing on LinkedIn"),
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadFeaturedCourses() {
      try {
        const publishedCourses = await courseService.listPublishedCourses();
        if (isMounted) { setFeaturedCourses(sortFeaturedCourses(publishedCourses).slice(0, 12)); setCourseError(null); }
      } catch (error) {
        if (isMounted) setCourseError(getCourseErrorMessage(error));
      } finally { if (isMounted) setIsLoadingCourses(false); }
    }
    void loadFeaturedCourses();
    return () => { isMounted = false; };
  }, []);

  function scrollFeaturedCourses(direction: -1 | 1) {
    const carousel = featuredCoursesRef.current;
    if (carousel) carousel.scrollBy({ behavior: "smooth", left: direction * carousel.clientWidth * 0.8 });
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="container home-hero__grid">
          <div className="home-hero__content">
            <span className="home-pill">{t("Kỷ nguyên học tập mới", "A new era of learning")}</span>
            <h1>{settings.branding.heroTitle[locale]}</h1>
            <p>{settings.branding.heroDescription[locale]}</p>
            <div className="home-hero__actions">
              <Link className="home-button home-button--primary" to="/register">{t("Bắt đầu học ngay", "Start learning")}</Link>
              <Link className="home-button home-button--outline" to="/courses">{t("Khám phá khóa học", "Explore courses")}</Link>
            </div>
          </div>
          <div className="home-hero__visual" aria-hidden="true">
            <span className="home-hero__blur home-hero__blur--purple" />
            <span className="home-hero__blur home-hero__blur--blue" />
            <div className="home-hero__artwork">
              <img alt="" decoding="async" {...{ fetchpriority: "high" }} height={1280} loading="eager" src={settings.branding.heroImageUrl || "/gds-hero.webp"} width={1280} />
            </div>
          </div>
        </div>
      </section>
      <section className="home-section home-section--muted">
        <div className="container">
          <div className="home-section__header home-course-section__header">
            <div>
              <h2>{t("Khóa học nổi bật", "Featured courses")}</h2>
              <p>{t("Những lộ trình được tuyển chọn từ dữ liệu GDS", "Explore curated learning opportunities on GDS")}</p>
            </div>
            <div className="home-course-section__actions">
              <Link className="home-section__link" to="/courses">{t("Xem tất cả", "View all")}<ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              {featuredCourses.length > 2 ? <div aria-label={t("Điều khiển khóa học nổi bật", "Featured course controls")} className="home-course-carousel__controls">
                <button aria-label={t("Khóa học trước", "Previous courses")} className="home-course-carousel__button" onClick={() => scrollFeaturedCourses(-1)} type="button">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button aria-label={t("Khóa học tiếp theo", "Next courses")} className="home-course-carousel__button" onClick={() => scrollFeaturedCourses(1)} type="button">
                  <ChevronRight aria-hidden="true" />
                </button>
              </div> : null}
            </div>
          </div>
          {isLoadingCourses ? <p className="home-course-state" role="status">{t("Đang tải khóa học nổi bật...", "Loading featured courses...")}</p> : null}
          {!isLoadingCourses && courseError ? <p className="home-course-state home-course-state--error" role="alert"><SystemText message={courseError} /></p> : null}
          {!isLoadingCourses && !courseError && featuredCourses.length === 0 ? <p className="home-course-state" role="status">{t("Chưa có khóa học nổi bật.", "No featured courses yet.")}</p> : null}
          {!isLoadingCourses && !courseError && featuredCourses.length > 0 ? <div aria-label={t("Danh sách khóa học nổi bật", "Featured courses")} className="home-course-grid" ref={featuredCoursesRef} role="region">{featuredCourses.map(course => <CourseCard className="home-course-card" course={course} key={course.id} />)}</div> : null}
        </div>
      </section>
      <section className="home-section home-section--compact">
        <div className="container">
          <BenefitAccessSection />
        </div>
      </section>
      <section className="home-section">
        <div className="container">
          <div className="home-section__center">
            <h2>{t("Tính năng AI thông minh", "Intelligent AI features")}</h2>
            <p>{t("Công cụ vừa đủ để hỗ trợ hiểu bài, ghi nhớ và ôn tập theo đúng ngữ cảnh học tập.", "Focused tools to help you understand, remember and review what you learn.")}</p>
          </div>
          <div className="home-ai-grid">{aiFeatures.map(feature => {
            const Icon = feature.icon; return <Link className="home-glass-card home-ai-card" key={feature.to + feature.title} to={feature.to}>
              <span className={`home-ai-card__icon home-ai-card__icon--${feature.tone}`}>
                <Icon aria-hidden="true" className="h-8 w-8" />
              </span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </Link>;
          })}</div>
        </div>
      </section>
      <section className="home-section home-certificate">
        <div className="container home-certificate__grid">
          <div className="home-certificate__image">
            <img alt={t("Mẫu chứng chỉ số GDS", "GDS digital certificate example")} decoding="async" height={840} loading="lazy" src={certificateImage} width={1200} />
          </div>
          <div>
            <h2>{t("Chứng chỉ số uy tín", "Trusted digital certificates")}</h2>
            <p>{t("Hoàn thành khóa học và nhận chứng chỉ số với mã định danh duy nhất để nhà tuyển dụng xác thực tức thì.", "Complete a course and earn a digital certificate with a unique identifier for instant verification.")}</p>
            <ul>{certificateBenefits.map(benefit => <li key={benefit}>
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />{benefit}</li>)}</ul>
            <Link className="home-button home-button--gradient" to="/certificates">{t("Nhận chứng chỉ ngay", "Earn your certificate")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
