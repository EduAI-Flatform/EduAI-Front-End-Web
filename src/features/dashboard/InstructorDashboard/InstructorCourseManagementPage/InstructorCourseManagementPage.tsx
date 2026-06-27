import { useEffect, useMemo, useState } from "react";
import {
  courseService,
  getCourseErrorMessage,
  type CourseStatus,
  type CourseSummary,
  type PaginatedCourses,
} from "../../../../services/course.service";
import { CourseManagementFilters } from "./CourseManagementFilters/CourseManagementFilters";
import { CourseManagementHeader } from "./CourseManagementHeader/CourseManagementHeader";
import { CourseManagementMetrics } from "./CourseManagementMetrics/CourseManagementMetrics";
import { InstructorCourseList } from "./InstructorCourseList/InstructorCourseList";
import "./InstructorCourseManagementPage.css";

const PAGE_SIZE = 20;

const emptyPagination: Omit<PaginatedCourses, "items"> = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export function InstructorCourseManagementPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseStatus | "all">("all");

  useEffect(() => {
    let isCurrent = true;

    async function loadCourses() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await courseService.listInstructorCourses({
          page,
          pageSize: PAGE_SIZE,
          search,
          status: status === "all" ? undefined : status,
        });

        if (isCurrent) {
          setCourses(response.items);
          setPagination({
            page: response.page,
            pageSize: response.pageSize,
            total: response.total,
            totalPages: response.totalPages,
          });
        }
      } catch (loadError) {
        if (isCurrent) {
          setCourses([]);
          setError(getCourseErrorMessage(loadError));
          setPagination({ ...emptyPagination, page });
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadCourses();
    return () => {
      isCurrent = false;
    };
  }, [page, search, status]);

  const counts = useMemo(
    () => ({
      archived: courses.filter((course) => course.status === "archived").length,
      draft: courses.filter((course) => course.status === "draft").length,
      published: courses.filter((course) => course.status === "published").length,
    }),
    [courses],
  );

  function updateSearch(value: string) {
    setPage(1);
    setSearch(value);
  }

  function updateStatus(value: CourseStatus | "all") {
    setPage(1);
    setStatus(value);
  }

  return (
    <div className="instructor-course-management">
      <CourseManagementHeader />
      <CourseManagementMetrics counts={counts} total={pagination.total} />
      <CourseManagementFilters
        onSearchChange={updateSearch}
        onStatusChange={updateStatus}
        search={search}
        status={status}
      />
      <InstructorCourseList
        courses={courses}
        error={error}
        isLoading={isLoading}
        onPageChange={setPage}
        pagination={pagination}
      />
    </div>
  );
}
