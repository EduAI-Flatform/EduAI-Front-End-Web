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
  it("keeps the card vertical on mobile and renders a lightweight detail link", () => {
    const { container } = render(
      <MemoryRouter>
        <CourseCard course={makeCourse()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/courses/course-long-title");
    expect(screen.getByRole("link")).toHaveAccessibleName(
      /Xem chi tiết khóa học Ứng dụng trí tuệ nhân tạo/i,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Ứng dụng trí tuệ nhân tạo",
    );
    expect(container.querySelector(".course-card__image .course-card__badge")).toHaveTextContent(
      "Nổi bật",
    );
    expect(container.querySelector(".course-card__body .course-card__badge")).not.toBeInTheDocument();

    const styles = readFileSync(
      resolve(process.cwd(), "src/features/courses/CourseCard/CourseCard.css"),
      "utf8",
    );
    const desktopStyles = styles.slice(0, styles.indexOf("@media"));
    expect(styles).toMatch(/course-card__image[^{]*\{[^}]*aspect-ratio:\s*8\s*\/\s*5/s);
    expect(styles).toMatch(/course-card__badge[^{]*\{[^}]*position:\s*absolute/s);
    expect(styles).toMatch(/course-card__link[^{]*\{[^}]*background:\s*transparent/s);
    expect(desktopStyles).toMatch(/course-card__footer[^{]*\{[^}]*flex-direction:\s*row/s);
    expect(styles).toMatch(/course-card__footer[^{]*\{[^}]*align-items:\s*center/s);
    expect(styles).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.course-card\s*\{[^}]*flex-direction:\s*column/s);
    expect(styles).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.course-card__image\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s);
    expect(styles).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.course-card__link span\s*\{[^}]*display:\s*none/s);
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
