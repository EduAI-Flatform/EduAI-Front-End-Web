import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
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

function HistoryControls() {
  const navigate = useNavigate(), location = useLocation();
  return <><button onClick={() => navigate(-1)}>Test back</button><button onClick={() => navigate(1)}>Test forward</button>
    <output data-testid="catalog-url">{location.search}</output></>;
}
describe("CoursesPage API states", () => {
  it('retains the restored online page while its first catalog request is pending', async () => {
    let resolve!: (courses: CourseSummary[]) => void;
    vi.mocked(courseService.listPublishedCourses).mockReturnValue(new Promise(value => { resolve = value; }));
    render(<MemoryRouter initialEntries={['/courses?program=online&page=2', '/courses?program=k12']} initialIndex={1}>
      <HistoryControls /><CoursesPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Test back' }));
    expect(screen.getByTestId('catalog-url')).toHaveTextContent('page=2');
    resolve(Array.from({ length: 10 }, (_, index) => makeCourse(index + 1)));
    expect(await screen.findByRole('heading', { name: /^Course 9$/ })).toBeVisible();
    expect(screen.getByTestId('catalog-url')).toHaveTextContent('page=2');
  });
  it('restores a discrete level selection through Back and Forward', async () => {
    vi.mocked(courseService.listPublishedCourses).mockResolvedValue([makeCourse(1)]);
    render(<MemoryRouter initialEntries={['/courses?level=beginner']}><HistoryControls /><CoursesPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: /^Course 1$/ });
    fireEvent.click(screen.getByRole('button', { name: 'Nâng cao' }));
    expect(screen.getByTestId('catalog-url')).toHaveTextContent('level=advanced');
    fireEvent.click(screen.getByRole('button', { name: 'Test back' }));
    expect(screen.getByTestId('catalog-url')).toHaveTextContent('level=beginner');
    fireEvent.click(screen.getByRole('button', { name: 'Test forward' }));
    expect(screen.getByTestId('catalog-url')).toHaveTextContent('level=advanced');
  });
  it('shows an unconnected program instead of unrelated native courses for a school group URL', async () => {
    vi.mocked(courseService.listPublishedCourses).mockResolvedValue([makeCourse(1)]);
    render(<MemoryRouter initialEntries={['/courses?program=k12']}><CoursesPage /></MemoryRouter>);
    expect(await screen.findByText('Chưa có chương trình được kết nối')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /^Course 1$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tìm hiểu liên kết GDS' })).toHaveAttribute('href', '/partners');
  });
  it('does not silently substitute online courses for an unknown program URL', async () => {
    vi.mocked(courseService.listPublishedCourses).mockResolvedValue([makeCourse(1)]);
    render(<MemoryRouter initialEntries={['/courses?program=missing']}><CoursesPage /></MemoryRouter>);
    expect(await screen.findByText('Nhóm chương trình không còn khả dụng')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /^Course 1$/ })).not.toBeInTheDocument();
  });
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
    expect(screen.queryByText("A focused learning path.")).not.toBeInTheDocument();
    expect(screen.getAllByText("4,5 (5 đánh giá)")).toHaveLength(8);

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
