import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
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
import { usePlatform } from '../platform/PlatformProvider';
import { CourseProgramNavigation, CourseProgramUnavailable } from './CourseProgramGroups';
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
  const messageForUi = useSystemMessages();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const query = searchParams.get('q') ?? '';
  const level = getLevelParam(searchParams.get('level'));
  const page = getPageParam(searchParams.get('page'));
  const { settings } = usePlatform();
  const programs = settings.courses.categories;
  const selectedId = searchParams.get('program') ?? (programs.find(program => program.id === 'online')?.id ?? programs[0]?.id ?? '');
  const selectedProgram = programs.find(program => program.id === selectedId);
  const isOnline = selectedProgram?.id === 'online';
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedCourses, setHasLoadedCourses] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline || hasLoadedCourses) return;
    let isMounted = true;
    setIsLoading(true);

    async function loadCourses() {
      try {
        const publishedCourses = await courseService.listPublishedCourses();

        if (isMounted) {
          setCourses(publishedCourses);
          setHasLoadedCourses(true);
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
  }, [isOnline, hasLoadedCourses]);

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
    if (isOnline && hasLoadedCourses && !isLoading && !errorMessage && page > totalPages) {
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(totalPages)); return next; }, { replace: true });
    }
  }, [page, totalPages, isOnline, hasLoadedCourses, isLoading, errorMessage, setSearchParams]);

  function updateParams(patch: Record<string, string | null>, replace = false) {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(patch)) { if (value === null) next.delete(key); else next.set(key, value); }
      return next;
    }, { replace });
  }

  function handleQueryChange(nextQuery: string) {
    updateParams({ q: nextQuery || null, page: null }, true);
  }

  function handleLevelChange(nextLevel: "all" | CourseLevel) {
    updateParams({ level: nextLevel === 'all' ? null : nextLevel, page: null });
  }

  function goToPage(nextPage: number) {
    const bounded = Math.min(Math.max(nextPage, 1), totalPages);
    updateParams({ page: bounded === 1 ? null : String(bounded) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="courses-page">
      <CourseListHero onQueryChange={handleQueryChange} query={query} />

      <main className="courses-main container courses-catalog-layout">
        <CourseProgramNavigation programs={programs} selectedId={selectedId}
          onChange={id => updateParams({ program: id, page: null })} />
        <div className="courses-catalog-content">
        {!isOnline ? <CourseProgramUnavailable program={selectedProgram}
          canReturn={programs.some(program => program.id === 'online')}
          onReturn={() => updateParams({ program: 'online', page: null })} /> : <>
        <CourseListToolbar level={level} onLevelChange={handleLevelChange} />

        {isLoading ? <CourseListSkeleton /> : null}

        {!isLoading && errorMessage ? (
          <section className="courses-section">
            <CourseListState
              message={errorMessage}
              title={messageForUi("Không thể tải khóa học")}
              tone="error"
            />
          </section>
        ) : null}

        {!isLoading && !errorMessage && filteredCourses.length === 0 ? (
          <section className="courses-section">
            <CourseListState
              message="Thử đổi từ khóa tìm kiếm hoặc chọn cấp độ khác."
              title={messageForUi("Chưa có khóa học phù hợp")}
              tone="empty"
            />
          </section>
        ) : null}

        {!isLoading && !errorMessage && filteredCourses.length > 0 ? (
          <section className="courses-section">
            <div className="courses-section__header">
              <div>
                <p className="courses-section__eyebrow"><SystemText message={"Danh mục học tập"} /></p>
                <h2><SystemText message={"Tất cả khóa học"} /></h2>
              </div>
              <span>
                {filteredCourses.length} <SystemText message={"kết quả · trang"} /> {page}/{totalPages}
              </span>
            </div>
            <div className="courses-grid">
              {paginatedCourses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
            {totalPages > 1 ? (
              <nav aria-label={messageForUi("Phân trang khóa học")} className="courses-pagination">
                <span className="courses-pagination__status">
                  <SystemText message={"Trang"} /> {page} <SystemText message={"trên"} /> {totalPages}
                </span>
                <div className="courses-pagination__actions">
                  <button
                    aria-label={messageForUi("Trang trước")}
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
                    aria-label={messageForUi("Trang sau")}
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
        </>}
        </div>
      </main>
    </div>
  );
}
