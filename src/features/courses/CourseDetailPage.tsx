import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import { BookOpen, Clock3, Signal, Users } from "lucide-react";
import { Modal } from "../../components/ui/modal";
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
import { commerceService, getCommerceErrorMessage } from "../../services/commerce.service";
import {
  enrollmentService,
  getEnrollmentErrorMessage,
} from "../../services/enrollment.service";
import {
  getVoucherErrorMessage,
  getVoucherReasonMessage,
  voucherService,
  type VoucherPreview,
} from "../../services/voucher.service";
import {
  getScholarshipErrorMessage,
  scholarshipService,
  type Scholarship,
} from "../../services/scholarship.service";
import "./CourseDetailPage.css";

export function CourseDetailPage() {
  const messageForUi = useSystemMessages();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthorPreview = searchParams.get("preview") === "1";
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
  const [voucherPreview, setVoucherPreview] = useState<VoucherPreview | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVoucherLoading, setIsVoucherLoading] = useState(false);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [appliedScholarshipIds, setAppliedScholarshipIds] = useState<string[]>([]);
  const [isScholarshipLoading, setIsScholarshipLoading] = useState(false);
  const [scholarshipError, setScholarshipError] = useState<string | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(false);

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
          isAuthorPreview ? courseService.getCoursePreview(courseId) : courseService.getCourse(courseId),
          isAuthorPreview ? courseService.listInstructorLessons(courseId) : courseService.listCourseLessons(courseId),
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
  }, [courseId, isAuthorPreview]);

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
    let isMounted = true;
    if (!courseId || !session) {
      setScholarships([]);
      setIsScholarshipLoading(false);
      return () => { isMounted = false; };
    }
    setIsScholarshipLoading(true);
    void scholarshipService.listEligible(courseId)
      .then((items) => { if (isMounted) { setScholarships(items); setScholarshipError(null); } })
      .catch((error) => { if (isMounted) setScholarshipError(getScholarshipErrorMessage(error)); })
      .finally(() => { if (isMounted) setIsScholarshipLoading(false); });
    return () => { isMounted = false; };
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

    if ((course?.price?.amountMinor ?? 0) > 0) {
      setEnrollmentError(null);
      setIsCartLoading(true);
      try {
        await commerceService.addCourse(courseId);
        navigate("/cart");
      } catch (error) {
        setEnrollmentError(getCommerceErrorMessage(error));
      } finally {
        setIsCartLoading(false);
      }
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

  async function handleVoucherPreview(code: string) {
    if (!courseId) return;
    if (!session) {
      navigate(`/login?redirectTo=${encodeURIComponent(`/courses/${courseId}`)}`);
      return;
    }

    setVoucherError(null);
    setVoucherPreview(null);
    setIsVoucherLoading(true);
    try {
      const preview = await voucherService.preview(courseId, code);
      if (preview.eligible) {
        setVoucherPreview(preview);
      } else {
        setVoucherError(getVoucherReasonMessage(preview.reason));
      }
    } catch (error) {
      setVoucherError(getVoucherErrorMessage(error));
    } finally {
      setIsVoucherLoading(false);
    }
  }

  async function handleScholarshipApply(scholarshipId: string) {
    if (!courseId || !session) return;
    setIsScholarshipLoading(true);
    setScholarshipError(null);
    try {
      await scholarshipService.apply(scholarshipId, courseId);
      setAppliedScholarshipIds((current) => current.includes(scholarshipId) ? current : [...current, scholarshipId]);
    } catch (error) {
      setScholarshipError(getScholarshipErrorMessage(error));
    } finally {
      setIsScholarshipLoading(false);
    }
  }

  function handleTabChange(tab: CourseDetailTab) {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
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
    if (isAuthorPreview || (lesson.isPreview && !isEnrolled)) {
      void openPreview(lesson);
      return;
    }
    if (courseId && isEnrolled) {
      navigate(`/learning/${courseId}?step=${encodeURIComponent(lesson.id)}`);
    }
  }

  function handlePreviewRequest() {
    const lesson = isAuthorPreview ? lessons[0] : lessons.find((item) => item.isPreview);
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
      {isAuthorPreview ? <div className="container" role="status"><SystemText message={"Xem trước dành cho tác giả — không ghi danh hoặc ghi nhận tiến độ học."} /></div> : null}
      <CourseDetailHero
        course={course}
        previewMode={isAuthorPreview}
        isEnrolled={isEnrolled}
        onEnroll={() => isAuthorPreview ? handlePreviewRequest() : void handleEnroll()}
        onSyllabus={handleSyllabus}
      />

      <section className="course-detail-stats-bar" aria-label={messageForUi("Thông tin khóa học")}>
        <div className="container course-detail-stats-bar__grid">
          <div className="course-detail-stats-bar__item">
            <span aria-hidden="true" className="course-detail-stats-bar__icon"><Users /></span>
            <div>
              <span><SystemText message="Học viên" /></span>
              <strong>
                {new Intl.NumberFormat(currentSystemLocale()).format(
                  course.metrics.enrollmentCount,
                )}
              </strong>
            </div>
          </div>
          <div className="course-detail-stats-bar__item">
            <span aria-hidden="true" className="course-detail-stats-bar__icon"><BookOpen /></span>
            <div>
              <span><SystemText message="Bài học" /></span>
              <strong>{course.metrics.lessonCount} <SystemText message={"bài"} /></strong>
            </div>
          </div>
          <div className="course-detail-stats-bar__item">
            <span aria-hidden="true" className="course-detail-stats-bar__icon"><Clock3 /></span>
            <div>
              <span><SystemText message="Thời lượng" /></span>
              <strong><SystemValue render={() => (formatCourseDuration(course.metrics.durationMinutes))} /></strong>
            </div>
          </div>
          <div className="course-detail-stats-bar__item">
            <span aria-hidden="true" className="course-detail-stats-bar__icon"><Signal /></span>
            <div>
              <span><SystemText message="Cấp độ" /></span>
              <strong><SystemText message={courseLevelLabels[course.level]} /></strong>
            </div>
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
                isEnrolled={isEnrolled || isAuthorPreview}
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
            {!isAuthorPreview ? <CourseEnrollCard
              course={course}
              enrollmentError={enrollmentError}
              isEnrolled={isEnrolled}
              isEnrollmentLoading={isEnrollmentLoading}
              isAuthenticated={Boolean(session)}
              isSubmitting={isSubmittingEnrollment}
              isCartLoading={isCartLoading}
              isVoucherLoading={isVoucherLoading}
              voucherError={voucherError}
              voucherPreview={voucherPreview}
              onPreview={handlePreviewRequest}
              onEnroll={handleEnroll}
              onVoucherPreview={(code) => void handleVoucherPreview(code)}
              scholarships={scholarships}
              appliedScholarshipIds={appliedScholarshipIds}
              isScholarshipLoading={isScholarshipLoading}
              scholarshipError={scholarshipError}
              onScholarshipApply={(scholarshipId) => void handleScholarshipApply(scholarshipId)}
            /> : null}
            <CourseSideInfo course={course} relatedCourses={relatedCourses} />
          </aside>
        </div>
      </section>
      {previewLesson ? (
        <Modal open onOpenChange={(open) => { if (!open) setPreviewLesson(null); }}
          className="max-w-5xl" title={previewLesson.title}
          description={isAuthorPreview ? messageForUi("Xem trước nội dung; không ghi nhận tiến độ học.") : messageForUi("Bài học thử")}>
            {isPreviewLoading ? <p><SystemText message={"Đang tải nội dung..."} /></p> : <PreviewContent lesson={previewContent} />}
        </Modal>
      ) : null}
    </main>
  );
}

function PreviewContent({ lesson }: { lesson: Awaited<ReturnType<typeof courseService.getLesson>> | null }) {
  if (!lesson) return <p><SystemText message={"Không thể tải bài học thử. Vui lòng thử lại."} /></p>;
  if (lesson.type === "video" && lesson.videoUrl) {
    return <video className="course-preview-dialog__media" controls src={lesson.videoUrl} />;
  }
  if (lesson.type === "pdf" && lesson.documentUrl) {
    return <iframe className="course-preview-dialog__media" title={lesson.title} src={lesson.documentUrl} />;
  }
  return <article className="course-preview-dialog__article">{lesson.content ?? <SystemText message={"Bài học chưa có nội dung."} />}</article>;
}
