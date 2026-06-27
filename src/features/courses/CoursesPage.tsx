import { useEffect, useMemo, useState } from "react";
import { CourseCard } from "./CourseCard/CourseCard";
import { CourseListHero } from "./CourseListHero/CourseListHero";
import { CourseListSkeleton } from "./CourseListSkeleton/CourseListSkeleton";
import { CourseListState } from "./CourseListState/CourseListState";
import { CourseListToolbar } from "./CourseListToolbar/CourseListToolbar";
import {
  stitchCourseSamples,
} from "./course-list-samples";
import type { CourseListItem } from "./course-list.types";
import {
  courseService,
  getCourseErrorMessage,
  type CourseLevel,
  type CourseSummary,
} from "../../services/course.service";
import "./CoursesPage.css";

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | CourseLevel>("all");
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

  const displayCourses: CourseListItem[] =
    courses.length > 0 ? courses : stitchCourseSamples;

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return displayCourses.filter((course) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        course.title.toLowerCase().includes(normalizedQuery) ||
        course.description.toLowerCase().includes(normalizedQuery) ||
        course.instructorName?.toLowerCase().includes(normalizedQuery);
      const matchesLevel = level === "all" || course.level === level;

      return matchesQuery && matchesLevel;
    });
  }, [displayCourses, level, query]);

  const recommendedCourses = filteredCourses.slice(0, 4);

  return (
    <div className="courses-page">
      <CourseListHero onQueryChange={setQuery} query={query} />

      <main className="courses-main container">
        <CourseListToolbar level={level} onLevelChange={setLevel} />

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

        {!isLoading && !errorMessage && recommendedCourses.length > 0 ? (
          <section className="courses-section">
            <div className="courses-section__header">
              <div className="courses-section__title">
                <span className="courses-section__icon" aria-hidden="true">
                  ✦
                </span>
                <h2>Gợi ý cho bạn</h2>
              </div>
            </div>
            <div className="courses-grid courses-grid--featured">
              {recommendedCourses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && !errorMessage && filteredCourses.length > 0 ? (
          <section className="courses-section">
            <div className="courses-section__header">
              <h2>Tất cả khóa học</h2>
              <span>{filteredCourses.length} khóa học</span>
            </div>
            <div className="courses-grid">
              {filteredCourses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
