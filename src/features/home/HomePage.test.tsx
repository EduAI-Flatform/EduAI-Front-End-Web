// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { courseService, type CourseSummary } from "../../services/course.service";
import { HomePage } from "./HomePage";

vi.mock("../../services/course.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/course.service")>();
  return {
    ...actual,
    courseService: {
      ...actual.courseService,
      listPublishedCourses: vi.fn(),
    },
  };
});

describe("HomePage featured courses", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a horizontal course carousel with inline navigation", async () => {
    vi.mocked(courseService.listPublishedCourses).mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => makeCourse(index + 1)),
    );

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByRole("article")).toHaveLength(6);
    expect(screen.getByRole("link", { name: /Xem tất cả/i })).toHaveAttribute(
      "href",
      "/courses",
    );
    expect(screen.getByRole("button", { name: /Khóa học trước/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Khóa học tiếp theo/i })).toBeInTheDocument();
  });
});

function makeCourse(index: number): CourseSummary {
  return {
    id: `home-course-${index}`,
    title: `Home Course ${index}`,
    slug: `home-course-${index}`,
    description: "A focused learning path.",
    thumbnailUrl: null,
    level: "beginner",
    status: "published",
    visibility: "public",
    badge: null,
    featuredRank: index,
    price: { amountMinor: 199000, currency: "VND" },
    instructor: {
      id: "instructor-1",
      fullName: "EduAI Instructor",
      avatarUrl: null,
      headline: "AI educator",
    },
    metrics: {
      lessonCount: 4,
      durationMinutes: 60,
      enrollmentCount: 10,
      ratingAverage: 4.5,
      ratingCount: 5,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
