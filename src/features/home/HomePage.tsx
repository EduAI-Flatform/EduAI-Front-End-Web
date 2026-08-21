import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BenefitAccessSection } from "../../components/learning/BenefitAccessSection";
import {
  courseService,
  getCourseErrorMessage,
  type CourseSummary,
} from "../../services/course.service";
import { CourseCard } from "../courses/CourseCard/CourseCard";
import { sortFeaturedCourses } from "../courses/course-display";
import "./HomePage.css";

const dashboardImage = "/demo-assets/dashboard-preview.svg";
const certificateImage = "/demo-assets/certificate-preview.svg";

const aiFeatures = [
  {
    title: "Gia sư AI",
    description:
      "Hỏi đáp nội dung học tập 24/7 với trợ lý hiểu ngữ cảnh và hỗ trợ như một giảng viên đồng hành.",
    icon: Bot,
    tone: "primary",
    to: "/ai",
  },
  {
    title: "Tóm tắt AI",
    description:
      "Chuyển bài giảng dài thành những ý chính súc tích để bạn nắm kiến thức nhanh hơn.",
    icon: FileText,
    tone: "secondary",
    to: "/ai/tools",
  },
  {
    title: "Tạo quiz bằng AI",
    description:
      "Tạo câu hỏi từ tài liệu học tập và kiểm tra mức độ hiểu bài ngay sau mỗi chương.",
    icon: HelpCircle,
    tone: "primary",
    to: "/ai/tools",
  },
  {
    title: "Flashcard AI",
    description:
      "Ôn tập bằng flashcard theo lộ trình lặp lại ngắt quãng phù hợp với tiến độ của bạn.",
    icon: Sparkles,
    tone: "secondary",
    to: "/ai/tools",
  },
];

const certificateBenefits = [
  "Chứng chỉ xác thực bằng QR Code",
  "Mã chứng chỉ duy nhất để tra cứu",
  "Dễ dàng chia sẻ lên LinkedIn",
];

export function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState<CourseSummary[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const featuredCoursesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedCourses() {
      try {
        const publishedCourses = await courseService.listPublishedCourses();
        if (isMounted) {
          setFeaturedCourses(sortFeaturedCourses(publishedCourses).slice(0, 12));
          setCourseError(null);
        }
      } catch (error) {
        if (isMounted) setCourseError(getCourseErrorMessage(error));
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    }

    void loadFeaturedCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  function scrollFeaturedCourses(direction: -1 | 1) {
    const carousel = featuredCoursesRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      behavior: "smooth",
      left: direction * (carousel.clientWidth * 0.8),
    });
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="container home-hero__grid">
          <div className="home-hero__content">
            <span className="home-pill">Kỷ nguyên học tập mới</span>
            <h1>Nền tảng học tập AI thế hệ mới</h1>
            <p>
              Tăng tốc lộ trình phát triển với AI Tutor cá nhân hóa. Hoàn thành
              khóa học và nhận chứng chỉ số có thể xác thực minh bạch bằng QR Code.
            </p>
            <div className="home-hero__actions">
              <Link className="home-button home-button--primary" to="/register">
                Bắt đầu học ngay
              </Link>
              <Link className="home-button home-button--outline" to="/courses">
                Khám phá khóa học
              </Link>
            </div>
          </div>

          <div className="home-hero__visual" aria-hidden="true">
            <span className="home-hero__blur home-hero__blur--purple" />
            <span className="home-hero__blur home-hero__blur--blue" />
            <div className="home-glass-card home-hero__mockup">
              <img
                alt=""
                decoding="async"
                {...{ fetchpriority: "high" }}
                height={820}
                loading="eager"
                src={dashboardImage}
                width={1200}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-section--muted">
        <div className="container">
          <div className="home-section__header home-course-section__header">
            <div>
              <h2>Khóa học nổi bật</h2>
              <p>Những lộ trình được tuyển chọn từ dữ liệu EduAI</p>
            </div>
            <div className="home-course-section__actions">
              <Link className="home-section__link" to="/courses">
                Xem tất cả
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              {featuredCourses.length > 2 ? (
                <div aria-label="Điều khiển khóa học nổi bật" className="home-course-carousel__controls">
                  <button aria-label="Khóa học trước" className="home-course-carousel__button" onClick={() => scrollFeaturedCourses(-1)} type="button">
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button aria-label="Khóa học tiếp theo" className="home-course-carousel__button" onClick={() => scrollFeaturedCourses(1)} type="button">
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {isLoadingCourses ? <p className="home-course-state" role="status">Đang tải khóa học nổi bật...</p> : null}
          {!isLoadingCourses && courseError ? <p className="home-course-state home-course-state--error" role="alert">{courseError}</p> : null}
          {!isLoadingCourses && !courseError && featuredCourses.length === 0 ? <p className="home-course-state" role="status">Chưa có khóa học nổi bật.</p> : null}
          {!isLoadingCourses && !courseError && featuredCourses.length > 0 ? (
            <div aria-label="Danh sách khóa học nổi bật" className="home-course-grid" ref={featuredCoursesRef} role="region">
              {featuredCourses.map((course) => (
                <CourseCard className="home-course-card" course={course} key={course.id} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="home-section home-section--compact">
        <div className="container"><BenefitAccessSection /></div>
      </section>

      <section className="home-section">
        <div className="container">
          <div className="home-section__center">
            <h2>Tính năng AI thông minh</h2>
            <p>Công cụ vừa đủ để hỗ trợ hiểu bài, ghi nhớ và ôn tập theo đúng ngữ cảnh học tập.</p>
          </div>
          <div className="home-ai-grid">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link className="home-glass-card home-ai-card" key={feature.title} to={feature.to}>
                  <span className={`home-ai-card__icon home-ai-card__icon--${feature.tone}`}>
                    <Icon aria-hidden="true" className="h-8 w-8" />
                  </span>
                  <div><h3>{feature.title}</h3><p>{feature.description}</p></div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-section home-certificate">
        <div className="container home-certificate__grid">
          <div className="home-certificate__image">
            <img alt="Mẫu chứng chỉ số EduAI" decoding="async" height={840} loading="lazy" src={certificateImage} width={1200} />
          </div>
          <div>
            <h2>Chứng chỉ số uy tín</h2>
            <p>Hoàn thành khóa học và nhận chứng chỉ số với mã định danh duy nhất để nhà tuyển dụng xác thực tức thì.</p>
            <ul>
              {certificateBenefits.map((benefit) => (
                <li key={benefit}><CheckCircle2 aria-hidden="true" className="h-5 w-5" />{benefit}</li>
              ))}
            </ul>
            <Link className="home-button home-button--gradient" to="/certificates">Nhận chứng chỉ ngay</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
