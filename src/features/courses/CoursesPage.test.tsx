import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { courseService, type CourseSummary } from "../../services/course.service";
import { CoursesPage } from "./CoursesPage";

vi.mock("../../services/course.service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../services/course.service")>();

  return {
    ...original,
    courseService: {
      ...original.courseService,
      listPublishedCourses: vi.fn(),
    },
  };
});

describe("CoursesPage API states", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state while the API request is pending", () => {
    vi.mocked(courseService.listPublishedCourses).mockReturnValue(
      new Promise<never>(() => undefined),
    );

    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByLabelText("Đang tải danh sách khóa học"),
    ).toBeInTheDocument();
  });

  it("shows an empty state instead of Stitch courses", async () => {
    vi.mocked(courseService.listPublishedCourses).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Chưa có khóa học phù hợp"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stitch/i)).not.toBeInTheDocument();
  });

  it("shows an API error without falling back to sample data", async () => {
    vi.mocked(courseService.listPublishedCourses).mockRejectedValue(
      new Error("API unavailable"),
    );

    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Không thể tải khóa học")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Machine Learning with Python/i)).not.toBeInTheDocument();
  });

  it("paginates a long catalog instead of rendering every course at once", async () => {
    const courses = Array.from({ length: 10 }, (_, index) => makeCourse(index + 1));
    vi.mocked(courseService.listPublishedCourses).mockResolvedValue(courses);

    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /^Course 1$/ })).toBeInTheDocument();
    expect(screen.getByText("Trang 1 trên 2")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Course 10$/ })).not.toBeInTheDocument();

    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: /^2$/ }));

    expect(await screen.findByRole("heading", { name: /^Course 10$/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Course 1$/ })).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

function makeCourse(index: number): CourseSummary {
  return {
    id: `course-${index}`,
    title: `Course ${index}`,
    slug: `course-${index}`,
    description: "A focused learning path.",
    thumbnailUrl: null,
    level: "beginner",
    status: "published",
    visibility: "public",
    badge: null,
    featuredRank: null,
    price: null,
    instructor: {
      id: "instructor-1",
      fullName: "An Nguyen",
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
