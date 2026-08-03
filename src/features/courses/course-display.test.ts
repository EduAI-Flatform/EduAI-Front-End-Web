import { describe, expect, it } from "vitest";
import type { CourseSummary } from "../../services/course.service";
import {
  formatCourseDuration,
  formatCoursePrice,
  formatCourseRating,
  getCourseCardViewModel,
  getCourseSearchText,
  sortFeaturedCourses,
} from "./course-display";

const course: CourseSummary = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Machine Learning với Python",
  slug: "machine-learning-voi-python",
  description: null,
  thumbnailUrl: "/demo-assets/course-placeholder.svg",
  level: "beginner",
  status: "published",
  visibility: "public",
  badge: "Bán chạy",
  featuredRank: 2,
  price: { amountMinor: 1299000, currency: "VND" },
  instructor: {
    id: "20000000-0000-4000-8000-000000000001",
    fullName: "Sarah Nguyen",
    avatarUrl: null,
    headline: "Giảng viên AI",
  },
  metrics: {
    lessonCount: 4,
    durationMinutes: 125,
    enrollmentCount: 8,
    ratingAverage: 4.75,
    ratingCount: 8,
  },
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("course display mapping", () => {
  it("formats minor-unit prices with the Vietnamese locale", () => {
    expect(formatCoursePrice(course.price)).toContain("1.299.000");
    expect(formatCoursePrice({ amountMinor: 0, currency: "VND" })).toBe(
      "Miễn phí",
    );
    expect(formatCoursePrice(null)).toBe("Chưa công bố giá");
  });

  it("formats rating and duration from real metrics", () => {
    expect(formatCourseRating(course.metrics)).toBe("4,8 (8 đánh giá)");
    expect(
      formatCourseRating({ ...course.metrics, ratingCount: 0 }),
    ).toBe("Chưa có đánh giá");
    expect(formatCourseDuration(125)).toBe("2 giờ 5 phút");
  });

  it("maps a nullable description without inventing sample data", () => {
    expect(getCourseCardViewModel(course)).toMatchObject({
      description: "Chưa có mô tả khóa học.",
      durationLabel: "2 giờ 5 phút",
      instructorName: "Sarah Nguyen",
    });
    expect(getCourseSearchText(course)).toContain("sarah nguyen");
  });

  it("orders featured courses by rank and excludes unranked courses", () => {
    const first = { ...course, id: "first", featuredRank: 1 };
    const unranked = { ...course, id: "unranked", featuredRank: null };

    expect(sortFeaturedCourses([course, unranked, first]).map(({ id }) => id)).toEqual([
      "first",
      course.id,
    ]);
  });
});
