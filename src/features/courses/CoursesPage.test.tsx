import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { courseService } from "../../services/course.service";
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
});
