// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CourseSummary } from "../../../services/course.service";
import { CourseCard } from "./CourseCard";

describe("CourseCard compact responsive contract", () => {
  it("uses a lazy 16:9 thumbnail and preserves a long Vietnamese title", () => {
    render(
      <MemoryRouter>
        <CourseCard course={makeCourse()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Ứng dụng trí tuệ nhân tạo",
    );

    const styles = readFileSync(
      resolve(process.cwd(), "src/features/courses/CourseCard/CourseCard.css"),
      "utf8",
    );
    expect(styles).toMatch(/course-card__image[^{]*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
    expect(styles).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.course-card\s*\{[^}]*flex-direction:\s*row/s);
  });
});

function makeCourse(): CourseSummary {
  return {
    id: "course-long-title",
    title: "Ứng dụng trí tuệ nhân tạo trong phân tích dữ liệu giáo dục hiện đại",
    slug: "course-long-title",
    description: "Mô tả khóa học bằng tiếng Việt có độ dài thực tế.",
    thumbnailUrl: "/demo-assets/course-placeholder.svg",
    level: "intermediate",
    status: "published",
    visibility: "public",
    badge: "Nổi bật",
    featuredRank: 1,
    price: { amountMinor: 899000, currency: "VND" },
    instructor: {
      id: "instructor-1",
      fullName: "Nguyễn Hoàng Minh Anh",
      avatarUrl: null,
      headline: "Giảng viên AI",
    },
    metrics: {
      lessonCount: 8,
      durationMinutes: 160,
      enrollmentCount: 42,
      ratingAverage: 4.7,
      ratingCount: 18,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
