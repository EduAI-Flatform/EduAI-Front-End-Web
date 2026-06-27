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
import { Link } from "react-router-dom";
import "./HomePage.css";

const dashboardImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC-_vBmalghOPt_OqUo9Vk_CziqjNtp-Fp3sIhmIk1QA20OaQfwrexBU-KnFUUbzxhKeUR_ocKbL_WO-KsnUc_e5Z8qnG438uok_V4UH3BZYe8Mhbfg-e7PdguUfDdL7KGeYXLv64ZF3SKrdhcCpT6ROpms6bzdL4zQLdE9cJU7cpCGjvUABxT_FLveNjYgDi0XjJA6YIBvqic1MmLvgDk1SBVQfqxCIKbNn6apB4xzwUyfpQK2yJOuxmtRNi2epcHxNMPdm4T-bV9A";

const certificateImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDyQm58pYUyzg_6O_IY1CjH06C5PxNHThzu9OeaK_PPoDHM9L7ILrQSgmTapERZtW9FbZlvsBBTWRbcxtO5qZZUwFBh6xfwV5ItMwYh5yZTwEFgIjfUyl0vov0Xm7aOx2eJt2-4ZY5SvPkMCpZgsesxcMhGYsLzv2jg4HUTDmlLGIu66ji3sJPD8iwTZmijjVNMFcMLRJhMY-2s5zea99_LzjQS5f09jcPfejf36rk7UkUB_wXpHrycmKi7ugr31yNAQPc8JQxTx_Ex";

const courses = [
  {
    title: "AI & Học máy",
    instructor: "Dr. Smith",
    rating: "4.9",
    badge: "Bán chạy",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDaDukFR--GivZhrGQOZisKsbtzqRCIKtM-BB7lu-gAKyDfAiBG9kOtL7fq3gSpcKSslNNYebyqg7UEVPUhm0lmyeMstAfNxN9lo12pTeosy8_edUfmMwGr9Zdu6QZEoH58j84HwZuTjyDVcU5MJa6maHUxmcebo48APVyZFUbszyiTRS0MUlr6AQ5LUon5PW0VE2xwF4NbWt1iAKffQ62LaeO1gWMpjDYkI5PQuG1Kn3ekpUf1BfTndJKggOXyx2KBklKnskI6ll0E",
  },
  {
    title: "Nền tảng Khoa học dữ liệu",
    instructor: "Sarah Johnson",
    rating: "4.8",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCRyIsMsgNilO3FcjAGpv3vGmLxfc4Z1o0JR9Q-jfLH8P2OjHwyuDBGqhze9CIqM_Tm70yJsCN1ccwaV_rsMuizZ3iyIebHJvPRwattMC8RvR_5XGwKsNIfeEEZUofu6z8kgXIccTuCf-x327rdib-0lNAbhBjNLiuy-hFfqWgB9kUnSenw8ky3qsmbI67GKaqrepgCdTFisU6GtH08ALlFSUFOTIuTvDegDU8NiAVki1g921iy4tQMWjf9VY4VCYK1JAxtwzRTs5Hy",
  },
  {
    title: "Digital Marketing với AI",
    instructor: "Mike Ross",
    rating: "4.7",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDdfm2IcEQ6sRudNZvtVMCAxuToV2osx7sL1QcAiLKVJ-XmIdti10F0C4E_rYDxCGLkSCC7_pKhZPXj5k0-R1gHS4YmjdY4A9HilDHzBHl4OAiVnkVy3csdHLY-RBcqwEvqU4ZrocL_oh7TNiNOxq18aYNlEp1JqzIWv6AAywDS0j3c0qDDGk8fsKgvqPF-4fiVlEiO8q1YSGiC3K17YYyqJShYKm0uKNb_zX6eo38F-jevPTXMCDnq5raX4sfLtDYx8bOsjFBNQXRU",
  },
];

const aiFeatures = [
  {
    title: "Gia sư AI",
    description:
      "Hỏi đáp mọi nội dung học tập 24/7. Trợ lý ảo hiểu ngữ cảnh và giải đáp thắc mắc như một giảng viên thực thụ.",
    icon: Bot,
    tone: "primary",
  },
  {
    title: "Tóm tắt AI",
    description:
      "Tóm tắt bài học trong vài giây, chuyển video bài giảng dài thành các gạch đầu dòng súc tích và dễ nhớ.",
    icon: FileText,
    tone: "secondary",
  },
  {
    title: "Tạo quiz bằng AI",
    description:
      "Tạo câu hỏi tự động từ tài liệu học tập để kiểm tra kiến thức ngay sau mỗi chương.",
    icon: HelpCircle,
    tone: "primary",
  },
  {
    title: "Flashcard AI",
    description:
      "Ôn tập bằng flashcard AI được thiết kế theo lộ trình lặp lại ngắt quãng thông minh.",
    icon: Sparkles,
    tone: "secondary",
  },
];

const certificateBenefits = [
  "Chứng chỉ xác thực bằng QR Code",
  "Bảo mật trên nền tảng Blockchain",
  "Dễ dàng chia sẻ lên LinkedIn",
];

export function HomePage() {
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
              <p>Lựa chọn bởi hơn 100,000 học viên trên toàn thế giới</p>
            </div>
            <Link className="home-section__link" to="/courses">
              Xem tất cả
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="home-course-grid">
            {courses.map((course) => (
              <article className="home-course-card" key={course.title}>
                <div className="home-course-card__image">
                  <img alt={course.title} src={course.image} />
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
                    {course.instructor}
                    <span>•</span>
                    <Star aria-hidden="true" className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {course.rating}
                  </p>
                  <Link className="home-course-card__button" to="/courses">
                    Xem chi tiết
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="container">
          <div className="home-section__center">
            <h2>Tính năng AI thông minh</h2>
            <p>
              Công nghệ AI tiên tiến giúp tối ưu hóa quá trình tiếp thu kiến
              thức và nâng cao hiệu quả học tập lên 300%.
            </p>
          </div>

          <div className="home-ai-grid">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="home-glass-card home-ai-card" key={feature.title}>
                  <span
                    className={`home-ai-card__icon home-ai-card__icon--${feature.tone}`}
                  >
                    <Icon aria-hidden="true" className="h-8 w-8" />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
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
