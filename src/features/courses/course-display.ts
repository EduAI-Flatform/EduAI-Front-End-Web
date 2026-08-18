import type {
  CourseLevel,
  CourseMetrics,
  CoursePrice,
  CourseStatus,
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
  priceDisplay: CoursePriceDisplay;
}

export type CoursePriceDisplayState =
  | "unpublished"
  | "unpriced"
  | "free"
  | "paid"
  | "discounted";

export interface CoursePriceDisplay {
  state: CoursePriceDisplayState;
  finalLabel: string;
  originalLabel: string | null;
  promotionLabel: string | null;
}

export interface CoursePriceDisplayOptions {
  status?: CourseStatus;
  originalPrice?: CoursePrice | null;
  promotionLabel?: string | null;
}

export function getCourseCardViewModel(
  course: CourseSummary,
): CourseCardViewModel {
  return {
    description: course.description?.trim() || "Chưa có mô tả khóa học.",
    durationLabel: formatCourseDuration(course.metrics.durationMinutes),
    instructorName: course.instructor.fullName,
    priceLabel: formatCoursePrice(course.price),
    priceDisplay: getCoursePriceDisplay(course.price, { status: course.status }),
    ratingLabel: formatCourseRating(course.metrics),
  };
}

export function formatCoursePrice(price: CoursePrice | null): string {
  if (!price) {
    return "Chưa công bố giá";
  }

  assertValidCoursePrice(price);

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

export function getCoursePriceDisplay(
  price: CoursePrice | null,
  options: CoursePriceDisplayOptions = {},
): CoursePriceDisplay {
  if (options.status && options.status !== "published") {
    return {
      state: "unpublished",
      finalLabel: "Chưa công bố",
      originalLabel: null,
      promotionLabel: null,
    };
  }

  if (!price) {
    return {
      state: "unpriced",
      finalLabel: "Chưa công bố giá",
      originalLabel: null,
      promotionLabel: null,
    };
  }

  assertValidCoursePrice(price);
  const originalPrice = options.originalPrice ?? null;
  const isDiscounted =
    originalPrice !== null && originalPrice.amountMinor > price.amountMinor;

  if (originalPrice !== null) {
    assertValidCoursePrice(originalPrice);
    if (originalPrice.currency.toUpperCase() !== price.currency.toUpperCase()) {
      throw new Error("Original and current course prices must use the same currency");
    }
  }

  return {
    state:
      price.amountMinor === 0
        ? "free"
        : isDiscounted
          ? "discounted"
          : "paid",
    finalLabel: formatCoursePrice(price),
    originalLabel:
      isDiscounted && originalPrice ? formatCoursePrice(originalPrice) : null,
    promotionLabel: isDiscounted ? options.promotionLabel ?? "Ưu đãi" : null,
  };
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

function assertValidCoursePrice(price: CoursePrice): void {
  if (!Number.isInteger(price.amountMinor) || price.amountMinor < 0) {
    throw new Error("Course price amountMinor must be a non-negative integer");
  }

  if (!/^[A-Z]{3}$/i.test(price.currency)) {
    throw new Error("Course price currency must be an ISO 4217 code");
  }
}
