import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  HelpCircle,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  courseService,
  getCourseErrorMessage,
  type CourseSummary,
} from "../../services/course.service";
import {
  formatCourseRating,
  sortFeaturedCourses,
} from "../courses/course-display";
import { BenefitAccessSection } from "../../components/learning/BenefitAccessSection";
import "./HomePage.css";

const dashboardImage = "/demo-assets/dashboard-preview.svg";
const certificateImage = "/demo-assets/certificate-preview.svg";

const aiFeatures = [
  {
    title: "Gia sư AI",
    description:
      "Hỏi đáp mọi nội dung học tập 24/7. Trợ lý ảo hiểu ngữ cảnh và giải đáp thắc mắc như một giảng viên thực thụ.",
    icon: Bot,
    tone: "primary",
    to: "/ai",
  },
  {
    title: "Tóm tắt AI",
    description:
      "Tóm tắt bài học trong vài giây, chuyển video bài giảng dài thành các gạch đầu dòng súc tích và dễ nhớ.",
    icon: FileText,
    tone: "secondary",
    to: "/ai/tools",
  },
  {
    title: "Tạo quiz bằng AI",
    description:
      "Tạo câu hỏi tự động từ tài liệu học tập để kiểm tra kiến thức ngay sau mỗi chương.",
    icon: HelpCircle,
    tone: "primary",
    to: "/ai/tools",
  },
  {
    title: "Flashcard AI",
    description:
      "Ôn tập bằng flashcard AI được thiết kế theo lộ trình lặp lại ngắt quãng thông minh.",
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

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedCourses() {
      try {
        const publishedCourses = await courseService.listPublishedCourses();

        if (isMounted) {
          setFeaturedCourses(sortFeaturedCourses(publishedCourses).slice(0, 3));
          setCourseError(null);
        }
      } catch (error) {
        if (isMounted) {
          setCourseError(getCourseErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingCourses(false);
        }
      }
    }

    void loadFeaturedCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="container home-hero__grid">
          <div className="home-hero__content">
            <span className="home-pill">Kỷ nguyên học tập mới</span>
            <h1>Nền tảng học tập AI thế hệ mới</h1>
            <p>
              Tăng tốc lộ trình phát triển của bạn với AI Tutor cá nhân hóa.
              Nhận chứng chỉ số xác thực minh bạch qua Blockchain và QR Code
              sau mỗi khóa học hoàn thành.
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
              <img alt="" src={dashboardImage} />
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-section--muted">
        <div className="container">
          <div className="home-section__header">
            <div>
              <h2>Khóa học nổi bật</h2>
              <p>Các khóa học được tuyển chọn từ dữ liệu EduAI</p>
            </div>
            <Link className="home-section__link" to="/courses">
              Xem tất cả
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {isLoadingCourses ? (
            <p className="home-course-state" role="status">
              Đang tải khóa học nổi bật...
            </p>
          ) : null}
          {!isLoadingCourses && courseError ? (
            <p className="home-course-state home-course-state--error" role="alert">
              {courseError}
            </p>
          ) : null}
          {!isLoadingCourses && !courseError && featuredCourses.length === 0 ? (
            <p className="home-course-state" role="status">
              Chưa có khóa học nổi bật.
            </p>
          ) : null}
          {!isLoadingCourses && !courseError && featuredCourses.length > 0 ? (
            <div className="home-course-grid">
            {featuredCourses.map((course) => (
              <article className="home-course-card" key={course.id}>
                <div className="home-course-card__image">
                  <img
                    alt={`Ảnh khóa học ${course.title}`}
                    src={course.thumbnailUrl ?? "/demo-assets/course-placeholder.svg"}
                  />
                  {course.badge ? (
                    <span className="home-course-card__badge">
                      {course.badge}
                    </span>
                  ) : null}
                </div>
                <div className="home-course-card__body">
                  <h3>{course.title}</h3>
                  <p>
                    <UserRound aria-hidden="true" className="h-4 w-4" />
                    {course.instructor.fullName}
                    <span>•</span>
                    <Star aria-hidden="true" className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {formatCourseRating(course.metrics)}
                  </p>
                  <Link
                    className="home-course-card__button"
                    to={`/courses/${course.id}`}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </article>
            ))}
            </div>
          ) : null}
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
            <h2>Tính năng AI thông minh</h2>
            <p>
              Công nghệ AI tiên tiến giúp tối ưu hóa quá trình tiếp thu kiến
              thức và hỗ trợ ôn tập theo nội dung bạn đang học.
            </p>
          </div>

          <div className="home-ai-grid">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link className="home-glass-card home-ai-card" key={feature.title} to={feature.to}>
                  <span
                    className={`home-ai-card__icon home-ai-card__icon--${feature.tone}`}
                  >
                    <Icon aria-hidden="true" className="h-8 w-8" />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-section home-certificate">
        <div className="container home-certificate__grid">
          <div className="home-certificate__image">
            <img alt="Mẫu chứng chỉ số EduAI" src={certificateImage} />
          </div>
          <div>
            <h2>Chứng chỉ số uy tín</h2>
            <p>
              Hoàn thành khóa học và nhận ngay chứng chỉ số có giá trị toàn
              cầu. Mỗi chứng chỉ đi kèm một mã định danh duy nhất và QR Code để
              nhà tuyển dụng xác thực tức thì.
            </p>
            <ul>
              {certificateBenefits.map((benefit) => (
                <li key={benefit}>
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link className="home-button home-button--gradient" to="/certificates">
              Nhận chứng chỉ ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
