import {
  CalendarClock,
  Loader2,
  Plus,
  RefreshCw,
  Video,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  classroomService,
  getClassroomErrorMessage,
  type ClassroomSession,
  type ClassroomSessionInput,
  type ClassroomSessionStatus,
} from "../../services/classroom.service";
import {
  courseService,
  getCourseErrorMessage,
  type CourseSummary,
} from "../../services/course.service";
import {
  enrollmentService,
  getEnrollmentErrorMessage,
  type Enrollment,
} from "../../services/enrollment.service";
import "./ClassroomDashboard.css";

type ClassroomDashboardMode = "instructor" | "student";

interface ClassroomDashboardProps {
  mode: ClassroomDashboardMode;
}

type CourseOption = Pick<CourseSummary, "id" | "title" | "status">;

const statusLabels: Record<ClassroomSessionStatus, string> = {
  cancelled: "Đã hủy",
  ended: "Đã kết thúc",
  live: "Đang diễn ra",
  scheduled: "Đã lên lịch",
};

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ClassroomDashboard({ mode }: ClassroomDashboardProps) {
  const isInstructor = mode === "instructor";
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const loadCourses = useCallback(async () => {
    setCourseError(null);
    setIsLoadingCourses(true);

    try {
      const nextCourses = isInstructor
        ? await loadInstructorCourseOptions()
        : await loadStudentCourseOptions();
      setCourses(nextCourses);
      setSelectedCourseId((currentCourseId) =>
        nextCourses.some((course) => course.id === currentCourseId)
          ? currentCourseId
          : nextCourses[0]?.id ?? "",
      );
    } catch (error) {
      setCourses([]);
      setSelectedCourseId("");
      setCourseError(
        isInstructor
          ? getCourseErrorMessage(error)
          : getEnrollmentErrorMessage(error),
      );
    } finally {
      setIsLoadingCourses(false);
    }
  }, [isInstructor]);

  const loadSessions = useCallback(async (courseId: string) => {
    if (!courseId) {
      setSessions([]);
      return;
    }

    setIsLoadingSessions(true);
    setSessionError(null);

    try {
      setSessions(await classroomService.listSessions(courseId));
    } catch (error) {
      setSessions([]);
      setSessionError(getClassroomErrorMessage(error));
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    void loadSessions(selectedCourseId);
  }, [loadSessions, selectedCourseId]);

  async function createSession(input: ClassroomSessionInput) {
    if (!selectedCourseId) return;

    setIsCreating(true);
    setFormError(null);

    try {
      await classroomService.createSession(selectedCourseId, input);
      await loadSessions(selectedCourseId);
    } catch (error) {
      setFormError(getClassroomErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div
      className={
        isInstructor
          ? "classroom-dashboard classroom-dashboard--instructor"
          : "classroom-dashboard student-dashboard__shell container"
      }
    >
      <header className="classroom-dashboard__header">
        <div>
          <span>{isInstructor ? "Lớp trực tuyến" : "Phòng học của tôi"}</span>
          <h1>{isInstructor ? "Quản lý lớp trực tuyến" : "Lịch học trực tuyến"}</h1>
          <p>
            {isInstructor
              ? "Lên lịch và theo dõi các buổi học theo từng khóa học."
              : "Xem các buổi học trực tuyến trong những khóa học đã đăng ký."}
          </p>
        </div>
        <strong>{sessions.length} buổi học</strong>
      </header>

      <section className="classroom-dashboard__toolbar">
        <label>
          <span>Khóa học</span>
          <select
            disabled={isLoadingCourses || courses.length === 0}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            value={selectedCourseId}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={isLoadingCourses || !selectedCourseId}
          onClick={() => void loadSessions(selectedCourseId)}
          type="button"
        >
          <RefreshCw aria-hidden="true" />
          Tải lại
        </button>
      </section>

      {courseError ? (
        <ClassroomState
          icon={RefreshCw}
          message={courseError}
          onRetry={() => void loadCourses()}
          tone="error"
        />
      ) : null}

      {!isLoadingCourses && !courseError && courses.length === 0 ? (
        <ClassroomState
          icon={CalendarClock}
          message={
            isInstructor
              ? "Chưa có khóa học để lên lịch lớp trực tuyến."
              : "Bạn chưa có khóa học đã đăng ký để xem lớp trực tuyến."
          }
        />
      ) : null}

      {isInstructor && selectedCourse ? (
        <ClassroomSessionForm
          courseTitle={selectedCourse.title}
          error={formError}
          isSaving={isCreating}
          onSubmit={createSession}
        />
      ) : null}

      <section className="classroom-dashboard__sessions" aria-labelledby="classroom-session-list">
        <div className="classroom-dashboard__section-heading">
          <div>
            <span>Danh sách buổi học</span>
            <h2 id="classroom-session-list">
              {selectedCourse?.title ?? "Lớp trực tuyến"}
            </h2>
          </div>
          {isLoadingSessions ? <Loader2 aria-hidden="true" className="is-spinning" /> : null}
        </div>

        {sessionError ? (
          <ClassroomState
            icon={RefreshCw}
            message={sessionError}
            onRetry={() => void loadSessions(selectedCourseId)}
            tone="error"
          />
        ) : null}

        {!sessionError && isLoadingSessions ? <ClassroomSkeleton /> : null}

        {!sessionError && !isLoadingSessions && sessions.length === 0 ? (
          <ClassroomState
            icon={Video}
            message="Chưa có buổi học trực tuyến nào cho khóa học này."
          />
        ) : null}

        {!sessionError && !isLoadingSessions && sessions.length > 0 ? (
          <div className="classroom-dashboard__grid">
            {sessions.map((session) => (
              <ClassroomSessionCard
                key={session.id}
                mode={mode}
                session={session}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ClassroomSessionForm({
  courseTitle,
  error,
  isSaving,
  onSubmit,
}: {
  courseTitle: string;
  error: string | null;
  isSaving: boolean;
  onSubmit: (input: ClassroomSessionInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateSessionForm(title, scheduledStart, scheduledEnd);

    setFieldError(validationError);
    if (validationError) return;

    await onSubmit({
      description: normalizeOptionalText(description),
      scheduledEnd: new Date(scheduledEnd).toISOString(),
      scheduledStart: new Date(scheduledStart).toISOString(),
      title: title.trim(),
    });

    setTitle("");
    setDescription("");
    setScheduledStart("");
    setScheduledEnd("");
  }

  return (
    <section className="classroom-form" aria-labelledby="classroom-form-title">
      <header className="classroom-form__header">
        <div>
          <span>Tạo lịch học</span>
          <h2 id="classroom-form-title">{courseTitle}</h2>
        </div>
        <Plus aria-hidden="true" />
      </header>

      {error || fieldError ? (
        <p className="classroom-form__alert" role="alert">
          {fieldError ?? error}
        </p>
      ) : null}

      <form className="classroom-form__body" onSubmit={submitForm}>
        <label>
          <span>Tiêu đề</span>
          <input
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ôn tập chương 1"
            type="text"
            value={title}
          />
        </label>

        <label className="classroom-form__wide">
          <span>Mô tả</span>
          <textarea
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Nội dung chính của buổi học"
            rows={3}
            value={description}
          />
        </label>

        <label>
          <span>Bắt đầu</span>
          <input
            onChange={(event) => setScheduledStart(event.target.value)}
            type="datetime-local"
            value={scheduledStart}
          />
        </label>

        <label>
          <span>Kết thúc</span>
          <input
            onChange={(event) => setScheduledEnd(event.target.value)}
            type="datetime-local"
            value={scheduledEnd}
          />
        </label>

        <div className="classroom-form__actions">
          <button disabled={isSaving} type="submit">
            <Plus aria-hidden="true" />
            {isSaving ? "Đang tạo..." : "Tạo buổi học"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ClassroomSessionCard({
  mode,
  session,
}: {
  mode: ClassroomDashboardMode;
  session: ClassroomSession;
}) {
  const canOpen = mode === "instructor" || session.status === "live";

  return (
    <article className={`classroom-card classroom-card--${session.status}`}>
      <div className="classroom-card__icon">
        <Video aria-hidden="true" />
      </div>
      <div className="classroom-card__content">
        <div className="classroom-card__title">
          <h3>{session.title}</h3>
          <span>{statusLabels[session.status]}</span>
        </div>
        <p>{session.description || "Buổi học chưa có mô tả."}</p>
        <dl className="classroom-card__meta">
          <div>
            <dt>Bắt đầu</dt>
            <dd>{dateTimeFormatter.format(new Date(session.scheduledStart))}</dd>
          </div>
          <div>
            <dt>Kết thúc</dt>
            <dd>{dateTimeFormatter.format(new Date(session.scheduledEnd))}</dd>
          </div>
        </dl>
        <div className="classroom-card__actions">
          {canOpen ? (
            <Link to={`/classroom-sessions/${session.id}`}>
              <Video aria-hidden="true" />
              {mode === "instructor" ? "Mở phòng học" : "Vào lớp"}
            </Link>
          ) : (
            <span>Chờ giảng viên bắt đầu</span>
          )}
        </div>
      </div>
    </article>
  );
}

function ClassroomState({
  icon: Icon,
  message,
  onRetry,
  tone = "neutral",
}: {
  icon: typeof Video;
  message: string;
  onRetry?: () => void;
  tone?: "error" | "neutral";
}) {
  return (
    <div className={`classroom-state classroom-state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" />
      <p>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} type="button">
          <RefreshCw aria-hidden="true" />
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

function ClassroomSkeleton() {
  return (
    <div className="classroom-dashboard__grid" aria-label="Đang tải lớp trực tuyến">
      {[0, 1, 2].map((item) => (
        <div className="classroom-card classroom-card--skeleton" key={item}>
          <span />
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

async function loadInstructorCourseOptions(): Promise<CourseOption[]> {
  const response = await courseService.listInstructorCourses({
    page: 1,
    pageSize: 100,
  });

  return response.items;
}

async function loadStudentCourseOptions(): Promise<CourseOption[]> {
  const enrollments = await enrollmentService.listMyEnrollments();

  return enrollments.map((enrollment: Enrollment) => ({
    id: enrollment.course.id,
    status: enrollment.course.status,
    title: enrollment.course.title,
  }));
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateSessionForm(
  title: string,
  scheduledStart: string,
  scheduledEnd: string,
): string | null {
  if (!title.trim()) {
    return "Vui lòng nhập tiêu đề buổi học.";
  }

  if (!scheduledStart || !scheduledEnd) {
    return "Vui lòng chọn thời gian bắt đầu và kết thúc.";
  }

  if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
    return "Thời gian kết thúc phải sau thời gian bắt đầu.";
  }

  return null;
}
