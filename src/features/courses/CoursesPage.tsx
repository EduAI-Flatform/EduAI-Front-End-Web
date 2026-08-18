import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CourseCard } from "./CourseCard/CourseCard";
import { CourseListHero } from "./CourseListHero/CourseListHero";
import { CourseListSkeleton } from "./CourseListSkeleton/CourseListSkeleton";
import { CourseListState } from "./CourseListState/CourseListState";
import { CourseListToolbar } from "./CourseListToolbar/CourseListToolbar";
import type { CourseListItem } from "./course-list.types";
import { getCourseSearchText } from "./course-display";
import {
  courseService,
  getCourseErrorMessage,
  type CourseLevel,
  type CourseSummary,
} from "../../services/course.service";
import "./CoursesPage.css";

const COURSE_PAGE_SIZE = 8;

function getPageParam(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getLevelParam(value: string | null): "all" | CourseLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced"
    ? value
    : "all";
}

export function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [level, setLevel] = useState<"all" | CourseLevel>(
    getLevelParam(searchParams.get("level")),
  );
  const [page, setPage] = useState(getPageParam(searchParams.get("page")));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const publishedCourses = await courseService.listPublishedCourses();

        if (isMounted) {
          setCourses(publishedCourses);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getCourseErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayCourses: CourseListItem[] = courses;

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return displayCourses.filter((course) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        getCourseSearchText(course).includes(normalizedQuery);
      const matchesLevel = level === "all" || course.level === level;

      return matchesQuery && matchesLevel;
    });
  }, [displayCourses, level, query]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / COURSE_PAGE_SIZE));
  const paginatedCourses = filteredCourses.slice(
    (page - 1) * COURSE_PAGE_SIZE,
    page * COURSE_PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (query.trim()) nextParams.set("q", query.trim());
    if (level !== "all") nextParams.set("level", level);
    if (page > 1) nextParams.set("page", String(page));
    setSearchParams(nextParams, { replace: true });
  }, [level, page, query, setSearchParams]);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setPage(1);
  }

  function handleLevelChange(nextLevel: "all" | CourseLevel) {
    setLevel(nextLevel);
    setPage(1);
  }

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="courses-page">
      <CourseListHero onQueryChange={handleQueryChange} query={query} />

      <main className="courses-main container">
        <CourseListToolbar level={level} onLevelChange={handleLevelChange} />

        {isLoading ? <CourseListSkeleton /> : null}

        {!isLoading && errorMessage ? (
          <section className="courses-section">
            <CourseListState
              message={errorMessage}
              title="Không thể tải khóa học"
              tone="error"
            />
          </section>
        ) : null}

        {!isLoading && !errorMessage && filteredCourses.length === 0 ? (
          <section className="courses-section">
            <CourseListState
              message="Thử đổi từ khóa tìm kiếm hoặc chọn cấp độ khác."
              title="Chưa có khóa học phù hợp"
              tone="empty"
            />
          </section>
        ) : null}

        {!isLoading && !errorMessage && filteredCourses.length > 0 ? (
          <section className="courses-section">
            <div className="courses-section__header">
              <div>
                <p className="courses-section__eyebrow">Danh mục học tập</p>
                <h2>Tất cả khóa học</h2>
              </div>
              <span>
                {filteredCourses.length} kết quả · trang {page}/{totalPages}
              </span>
            </div>
            <div className="courses-grid">
              {paginatedCourses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
            {totalPages > 1 ? (
              <nav aria-label="Phân trang khóa học" className="courses-pagination">
                <span className="courses-pagination__status">
                  Trang {page} trên {totalPages}
                </span>
                <div className="courses-pagination__actions">
                  <button
                    aria-label="Trang trước"
                    className="courses-pagination__button"
                    disabled={page === 1}
                    onClick={() => goToPage(page - 1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (pageNumber) => (
                      <button
                        aria-current={pageNumber === page ? "page" : undefined}
                        className={`courses-pagination__button ${pageNumber === page ? "courses-pagination__button--active" : ""}`}
                        key={pageNumber}
                        onClick={() => goToPage(pageNumber)}
                        type="button"
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}
                  <button
                    aria-label="Trang sau"
                    className="courses-pagination__button"
                    disabled={page === totalPages}
                    onClick={() => goToPage(page + 1)}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
