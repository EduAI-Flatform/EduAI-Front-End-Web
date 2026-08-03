import type {
  CourseLevel,
  CourseMetrics,
  CoursePrice,
  CourseSummary,
  LessonType,
} from "../../services/course.service";

export const courseLevelLabels: Record<CourseLevel, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export const lessonTypeLabels: Record<LessonType, string> = {
  video: "Video",
  pdf: "PDF",
  article: "Bài đọc",
};

export interface CourseCardViewModel {
  description: string;
  durationLabel: string;
  instructorName: string;
  priceLabel: string;
  ratingLabel: string;
}

export function getCourseCardViewModel(
  course: CourseSummary,
): CourseCardViewModel {
  return {
    description: course.description?.trim() || "Chưa có mô tả khóa học.",
    durationLabel: formatCourseDuration(course.metrics.durationMinutes),
    instructorName: course.instructor.fullName,
    priceLabel: formatCoursePrice(course.price),
    ratingLabel: formatCourseRating(course.metrics),
  };
}

export function formatCoursePrice(price: CoursePrice | null): string {
  if (!price) {
    return "Chưa công bố giá";
  }

  if (price.amountMinor === 0) {
    return "Miễn phí";
  }

  const currency = price.currency.toUpperCase();
  const fractionDigits = getCurrencyFractionDigits(currency);
  const amount = price.amountMinor / 10 ** fractionDigits;

  try {
    return new Intl.NumberFormat("vi-VN", {
      currency,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
      style: "currency",
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("vi-VN").format(amount)} ${currency}`;
  }
}

export function formatCourseRating(metrics: CourseMetrics): string {
  if (metrics.ratingCount === 0 || metrics.ratingAverage === null) {
    return "Chưa có đánh giá";
  }

  const average = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(metrics.ratingAverage);
  const count = new Intl.NumberFormat("vi-VN").format(metrics.ratingCount);

  return `${average} (${count} đánh giá)`;
}

export function formatCourseDuration(durationMinutes: number): string {
  if (durationMinutes <= 0) {
    return "Chưa cập nhật thời lượng";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} phút`;
  }

  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

export function getCourseSearchText(course: CourseSummary): string {
  return [
    course.title,
    course.description ?? "",
    course.instructor.fullName,
    course.instructor.headline ?? "",
    course.badge ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("vi-VN");
}

export function sortFeaturedCourses(
  courses: CourseSummary[],
): CourseSummary[] {
  return courses
    .filter(
      (course): course is CourseSummary & { featuredRank: number } =>
        course.featuredRank !== null,
    )
    .sort((first, second) => first.featuredRank - second.featuredRank);
}

function getCurrencyFractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("vi-VN", {
      currency,
      style: "currency",
    }).resolvedOptions().maximumFractionDigits ?? 0;
  } catch {
    return 0;
  }
}
