import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuthSession } from "../auth/auth-store";
import { CourseDetailHero } from "./CourseDetailHero/CourseDetailHero";
import { CourseDetailSkeleton } from "./CourseDetailSkeleton/CourseDetailSkeleton";
import { CourseDetailState } from "./CourseDetailState/CourseDetailState";
import { CourseEnrollCard } from "./CourseEnrollCard/CourseEnrollCard";
import { CourseLessons } from "./CourseLessons/CourseLessons";
import type { CourseDetailTab } from "./CourseLessons/CourseLessons";
import { CourseSideInfo } from "./CourseSideInfo/CourseSideInfo";
import type { CourseDetailView } from "./course-detail.types";
import {
  courseLevelLabels,
  formatCourseDuration,
} from "./course-display";
import {
  courseService,
  getCourseErrorMessage,
  type CourseSummary,
  type LessonSummary,
} from "../../services/course.service";
import {
  assignmentService,
  type AssignmentSummary,
} from "../../services/assignment.service";
import { ApiClientError } from "../../services/api-client";
import {
  enrollmentService,
  getEnrollmentErrorMessage,
} from "../../services/enrollment.service";
import "./CourseDetailPage.css";

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAuthSession();
  const [course, setCourse] = useState<CourseDetailView | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrollmentLoading, setIsEnrollmentLoading] = useState(false);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CourseDetailTab>(() => {
    const tab = searchParams.get("tab");
    return tab === "overview" || tab === "assignments" || tab === "reviews" ? tab : "lessons";
  });
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [previewLesson, setPreviewLesson] = useState<LessonSummary | null>(null);
  const [previewContent, setPreviewContent] = useState<Awaited<ReturnType<typeof courseService.getLesson>> | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCourseDetail() {
      if (!courseId) {
        setErrorMessage("Không tìm thấy mã khóa học.");
        setIsLoading(false);
        return;
      }

      try {
        const [courseDetail, courseLessons, publishedCourses] = await Promise.all([
          courseService.getCourse(courseId),
          courseService.listCourseLessons(courseId),
          courseService
            .listPublishedCourses()
            .catch(() => [] as CourseSummary[]),
        ]);

        if (isMounted) {
          setCourse(courseDetail);
          setLessons(courseLessons);
          setRelatedCourses(
            publishedCourses
              .filter((publishedCourse) => publishedCourse.id !== courseId)
              .slice(0, 2),
          );
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

    void loadCourseDetail();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    let isMounted = true;

    async function loadEnrollmentStatus() {
      setEnrollmentError(null);
      setIsEnrolled(false);

      if (!courseId || !session) {
        setIsEnrollmentLoading(false);
        return;
      }

      setIsEnrollmentLoading(true);

      try {
        const enrollments = await enrollmentService.listMyEnrollments();

        if (isMounted) {
          setIsEnrolled(enrollments.some((item) => item.courseId === courseId));
        }
      } catch (error) {
        if (isMounted) {
          setEnrollmentError(getEnrollmentErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsEnrollmentLoading(false);
        }
      }
    }

    void loadEnrollmentStatus();

    return () => {
      isMounted = false;
    };
  }, [courseId, session]);

  useEffect(() => {
    if (!courseId || !isEnrolled) {
      setAssignments([]);
      return;
    }
    void assignmentService.listCourseAssignments(courseId).then(setAssignments).catch(() => setAssignments([]));
  }, [courseId, isEnrolled]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "lessons" || tab === "assignments" || tab === "reviews") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  async function handleEnroll() {
    if (!courseId) {
      return;
    }

    if (!session) {
      navigate(`/login?redirectTo=${encodeURIComponent(`/courses/${courseId}`)}`);
      return;
    }

    if (isEnrolled) {
      navigate(`/learning/${courseId}`);
      return;
    }

    setEnrollmentError(null);
    setIsSubmittingEnrollment(true);

    try {
      await enrollmentService.enrollCourse(courseId);
      setIsEnrolled(true);
      navigate(`/learning/${courseId}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setIsEnrolled(true);
      } else {
        setEnrollmentError(getEnrollmentErrorMessage(error));
      }
    } finally {
      setIsSubmittingEnrollment(false);
    }
  }

  function handleTabChange(tab: CourseDetailTab) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

  function handleSyllabus() {
    handleTabChange("lessons");
    requestAnimationFrame(() => {
      document.getElementById("course-syllabus")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function openPreview(lesson: LessonSummary) {
    setPreviewLesson(lesson);
    setPreviewContent(null);
    setIsPreviewLoading(true);
    try {
      setPreviewContent(await courseService.getLesson(lesson.id));
    } catch (error) {
      setEnrollmentError(getCourseErrorMessage(error));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function handleLessonSelect(lesson: LessonSummary) {
    if (lesson.isPreview && !isEnrolled) {
      void openPreview(lesson);
      return;
    }
    if (courseId && isEnrolled) {
      navigate(`/learning/${courseId}?step=${encodeURIComponent(lesson.id)}`);
    }
  }

  function handlePreviewRequest() {
    const lesson = lessons.find((item) => item.isPreview);
    if (lesson) void openPreview(lesson);
    else setEnrollmentError("Khóa học chưa có bài học thử.");
  }

  if (isLoading) {
    return <CourseDetailSkeleton />;
  }

  if (errorMessage || !course) {
    return (
      <CourseDetailState
        message={
          errorMessage ||
          "Khóa học không tồn tại hoặc chưa được xuất bản công khai."
        }
      />
    );
  }

  return (
    <main className="course-detail-page">
      <CourseDetailHero
        course={course}
        isEnrolled={isEnrolled}
        onEnroll={() => void handleEnroll()}
        onSyllabus={handleSyllabus}
      />

      <section className="course-detail-stats-bar" aria-label="Thông tin khóa học">
        <div className="container course-detail-stats-bar__grid">
          <div>
            <span>Học viên</span>
            <strong>
              {new Intl.NumberFormat("vi-VN").format(
                course.metrics.enrollmentCount,
              )}
            </strong>
          </div>
          <div>
            <span>Bài học</span>
            <strong>{course.metrics.lessonCount} bài</strong>
          </div>
          <div>
            <span>Thời lượng</span>
            <strong>{formatCourseDuration(course.metrics.durationMinutes)}</strong>
          </div>
          <div>
            <span>Cấp độ</span>
            <strong>{courseLevelLabels[course.level]}</strong>
          </div>
        </div>
      </section>

      <section className="course-detail-body">
        <div className="container course-detail-body__grid">
          <div className="course-detail-main">
            <div id="course-syllabus">
              <CourseLessons
                activeTab={activeTab}
                assignments={assignments}
                courseDescription={course.description}
                isEnrolled={isEnrolled}
                lessons={lessons}
                onAssignmentSelect={(assignment) => navigate(`/assignments/${assignment.id}/submit`)}
                onLessonSelect={handleLessonSelect}
                onTabChange={handleTabChange}
                ratingAverage={course.metrics.ratingAverage}
                ratingCount={course.metrics.ratingCount}
              />
            </div>
          </div>
          <aside className="course-detail-sidebar">
            <CourseEnrollCard
              course={course}
              enrollmentError={enrollmentError}
              isEnrolled={isEnrolled}
              isEnrollmentLoading={isEnrollmentLoading}
              isSubmitting={isSubmittingEnrollment}
              onPreview={handlePreviewRequest}
              onEnroll={handleEnroll}
            />
            <CourseSideInfo course={course} relatedCourses={relatedCourses} />
          </aside>
        </div>
      </section>
      {previewLesson ? (
        <div className="course-preview-dialog" role="presentation">
          <button
            aria-label="Đóng bài học thử"
            className="course-preview-dialog__backdrop"
            onClick={() => setPreviewLesson(null)}
            type="button"
          />
          <section aria-labelledby="course-preview-title" className="course-preview-dialog__panel" role="dialog">
            <button
              aria-label="Đóng"
              className="course-preview-dialog__close"
              onClick={() => setPreviewLesson(null)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <span>Bài học thử</span>
            <h2 id="course-preview-title">{previewLesson.title}</h2>
            {isPreviewLoading ? <p>Đang tải nội dung...</p> : <PreviewContent lesson={previewContent} />}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function PreviewContent({ lesson }: { lesson: Awaited<ReturnType<typeof courseService.getLesson>> | null }) {
  if (!lesson) return <p>Không thể tải bài học thử. Vui lòng thử lại.</p>;
  if (lesson.type === "video" && lesson.videoUrl) {
    return <video className="course-preview-dialog__media" controls src={lesson.videoUrl} />;
  }
  if (lesson.type === "pdf" && lesson.documentUrl) {
    return <iframe className="course-preview-dialog__media" title={lesson.title} src={lesson.documentUrl} />;
  }
  return <article className="course-preview-dialog__article">{lesson.content ?? "Bài học chưa có nội dung."}</article>;
}
