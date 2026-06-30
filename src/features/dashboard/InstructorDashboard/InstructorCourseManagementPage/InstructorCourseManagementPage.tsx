import { useCallback, useEffect, useMemo, useState } from "react";
import {
  courseService,
  getCourseErrorMessage,
  type CourseMutationInput,
  type CourseStatus,
  type CourseSummary,
  type PaginatedCourses,
} from "../../../../services/course.service";
import { CourseManagementFilters } from "./CourseManagementFilters/CourseManagementFilters";
import { CourseManagementForm } from "./CourseManagementForm/CourseManagementForm";
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
  const [editingCourse, setEditingCourse] = useState<CourseSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutatingCourseId, setMutatingCourseId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseStatus | "all">("all");

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await courseService.listInstructorCourses({
        page,
        pageSize: PAGE_SIZE,
        search,
        status: status === "all" ? undefined : status,
      });

      setCourses(response.items);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (loadError) {
      setCourses([]);
      setError(getCourseErrorMessage(loadError));
      setPagination({ ...emptyPagination, page });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    let isCurrent = true;

    async function loadCurrentCourses() {
      if (!isCurrent) return;
      await loadCourses();
    }

    void loadCurrentCourses();
    return () => {
      isCurrent = false;
    };
  }, [loadCourses]);

  const counts = useMemo(
    () => ({
      archived: courses.filter((course) => course.status === "archived").length,
      draft: courses.filter((course) => course.status === "draft").length,
      published: courses.filter((course) => course.status === "published").length,
    }),
    [courses],
  );

  function openCreateForm() {
    setEditingCourse(null);
    setFormError(null);
    setMutationError(null);
    setIsFormOpen(true);
  }

  function openEditForm(course: CourseSummary) {
    setEditingCourse(course);
    setFormError(null);
    setMutationError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingCourse(null);
    setFormError(null);
    setIsFormOpen(false);
  }

  async function saveCourse(input: CourseMutationInput) {
    setIsSaving(true);
    setFormError(null);

    try {
      if (editingCourse) {
        await courseService.updateCourse(editingCourse.id, input);
      } else {
        await courseService.createCourse(input);
      }

      closeForm();
      if (!editingCourse && page !== 1) {
        setPage(1);
      } else {
        await loadCourses();
      }
    } catch (saveError) {
      setFormError(getCourseErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function publishCourse(course: CourseSummary) {
    await mutateCourse(course.id, () => courseService.publishCourse(course.id));
  }

  async function archiveCourse(course: CourseSummary) {
    await mutateCourse(course.id, () => courseService.archiveCourse(course.id));
  }

  async function mutateCourse(courseId: string, action: () => Promise<CourseSummary>) {
    setMutatingCourseId(courseId);
    setMutationError(null);

    try {
      await action();
      await loadCourses();
    } catch (mutationFailure) {
      setMutationError(getCourseErrorMessage(mutationFailure));
    } finally {
      setMutatingCourseId(null);
    }
  }

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
      <CourseManagementHeader onCreate={openCreateForm} />
      <CourseManagementMetrics counts={counts} total={pagination.total} />
      {isFormOpen ? (
        <CourseManagementForm
          course={editingCourse}
          error={formError}
          isSaving={isSaving}
          onCancel={closeForm}
          onSubmit={saveCourse}
        />
      ) : null}
      {mutationError ? (
        <p className="instructor-course-management__error" role="alert">
          {mutationError}
        </p>
      ) : null}
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
        mutatingCourseId={mutatingCourseId}
        onArchive={archiveCourse}
        onEdit={openEditForm}
        onPageChange={setPage}
        onPublish={publishCourse}
        pagination={pagination}
      />
    </div>
  );
}
