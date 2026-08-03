import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import {
  assignmentService,
  getAssignmentErrorMessage,
  type AssignmentSummary,
} from "../../../services/assignment.service";
import {
  courseService,
  getCourseErrorMessage,
  type CourseDetail,
  type LessonDetail,
  type LessonSummary,
} from "../../../services/course.service";
import {
  getLearningErrorMessage,
  learningService,
  type CourseProgress,
} from "../../../services/learning.service";
import {
  getQuizErrorMessage,
  quizService,
  type QuizSummary,
} from "../../../services/quiz.service";
import { LessonNavigation } from "./LessonNavigation/LessonNavigation";
import { LessonPlayer } from "./LessonPlayer/LessonPlayer";
import "./LearningPage.css";

export function LearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedLesson = useMemo(() => {
    if (lessons.length === 0) {
      return null;
    }

    const requestedLessonId = searchParams.get("lesson");
    return (
      lessons.find((lesson) => lesson.id === requestedLessonId) ??
      lessons[Math.min(completedLessonIds.size, lessons.length - 1)]
    );
  }, [completedLessonIds.size, lessons, searchParams]);

  const loadLearningPage = useCallback(async () => {
    if (!courseId) {
      setErrorMessage("Không tìm thấy khóa học.");
      setIsLoading(false);
      return;
    }

    setActionMessage(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const [courseDetail, courseLessons, courseProgress] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.listCourseLessons(courseId),
        learningService.getCourseProgress(courseId),
      ]);
      const courseQuizzes = await quizService
        .listStudentCourseQuizzes(courseId)
        .catch(() => [] as QuizSummary[]);
      const courseAssignments = await assignmentService
        .listCourseAssignments(courseId)
        .catch(() => [] as AssignmentSummary[]);
      const orderedLessons = [...courseLessons].sort(
        (first, second) => first.orderIndex - second.orderIndex,
      );

      setCourse(courseDetail);
      setLessons(orderedLessons);
      setProgress(courseProgress);
      setAssignments(courseAssignments);
      setQuizzes(courseQuizzes);
      setCompletedLessonIds(new Set(courseProgress.completedLessonIds));
    } catch (error) {
      const courseError = getCourseErrorMessage(error);
      setErrorMessage(
        courseError ||
          getLearningErrorMessage(error) ||
          getQuizErrorMessage(error) ||
          getAssignmentErrorMessage(error),
      );
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadLearningPage();
  }, [loadLearningPage]);

  useEffect(() => {
    if (!selectedLesson || searchParams.get("lesson")) {
      return;
    }

    setSearchParams({ lesson: selectedLesson.id }, { replace: true });
  }, [searchParams, selectedLesson, setSearchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadLessonDetail() {
      if (!selectedLesson) {
        setLessonDetail(null);
        setLessonError(null);
        return;
      }

      setIsLoadingLesson(true);
      setLessonError(null);

      try {
        const detail = await courseService.getLesson(selectedLesson.id);

        if (isMounted) {
          setLessonDetail(detail);
        }
      } catch (error) {
        if (isMounted) {
          setLessonDetail(null);
          setLessonError(getLearningErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingLesson(false);
        }
      }
    }

    void loadLessonDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedLesson]);

  async function handleCompleteLesson() {
    if (!selectedLesson || completedLessonIds.has(selectedLesson.id)) {
      return;
    }

    setActionMessage(null);
    setIsCompleting(true);

    try {
      const updatedProgress = await learningService.completeLesson(selectedLesson.id);
      setProgress(updatedProgress);
      setCompletedLessonIds((current) => new Set(current).add(selectedLesson.id));
      setActionMessage("Đã cập nhật tiến độ học tập.");

      const nextLesson = lessons.find(
        (lesson) =>
          lesson.orderIndex > selectedLesson.orderIndex &&
          !completedLessonIds.has(lesson.id),
      );

      if (nextLesson) {
        setSearchParams({ lesson: nextLesson.id });
      }
    } catch (error) {
      setActionMessage(getLearningErrorMessage(error));
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return <LearningSkeleton />;
  }

  if (errorMessage || !course) {
    return (
      <main className="learning-page">
        <section className="learning-page__state" role="alert">
          <AlertCircle aria-hidden="true" />
          <h1>Chưa thể mở bài học</h1>
          <p>{errorMessage ?? "Khóa học không tồn tại hoặc bạn chưa được cấp quyền học."}</p>
          <button onClick={() => void loadLearningPage()} type="button">
            <RefreshCw aria-hidden="true" />
            Thử lại
          </button>
          <Link to="/dashboard/learning">Quay lại khóa học của tôi</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="learning-page">
      <header className="learning-page__topbar">
        <Link to="/dashboard/learning">
          <ArrowLeft aria-hidden="true" />
          Khóa học của tôi
        </Link>
        <div>
          <span>Đang học</span>
          <h1>{course.title}</h1>
        </div>
        {progress ? (
          <strong>
            {progress.completedLessons}/{progress.totalLessons} bài học
          </strong>
        ) : null}
      </header>

      <section className="learning-page__body">
        <LessonPlayer
          actionMessage={actionMessage}
          isComplete={Boolean(selectedLesson && completedLessonIds.has(selectedLesson.id))}
          isCompleting={isCompleting}
          isLoading={isLoadingLesson}
          lesson={lessonDetail}
          loadError={lessonError}
          onComplete={handleCompleteLesson}
        />

        <aside className="learning-page__sidebar" aria-label="Điều hướng bài học">
          {progress ? (
            <div className="learning-page__progress-card">
              <div>
                <span>Tiến độ khóa học</span>
                <strong>{Math.round(progress.progressPercent)}%</strong>
              </div>
              <div
                aria-label={`Tiến độ khóa học ${Math.round(progress.progressPercent)}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(progress.progressPercent)}
                className="learning-page__progress"
                role="progressbar"
              >
                <span style={{ width: `${Math.round(progress.progressPercent)}%` }} />
              </div>
              {progress.completed ? (
                <p>
                  <CheckCircle2 aria-hidden="true" />
                  Bạn đã hoàn thành khóa học này.
                </p>
              ) : null}
            </div>
          ) : null}

          <LessonNavigation
            completedLessonIds={completedLessonIds}
            lessons={lessons}
            selectedLessonId={selectedLesson?.id ?? null}
            onSelectLesson={(lessonId) => {
              setActionMessage(null);
              setSearchParams({ lesson: lessonId });
            }}
          />
          <section className="learning-page__quiz-card" aria-labelledby="learning-quizzes-title">
            <div>
              <span>Đánh giá</span>
              <h2 id="learning-quizzes-title">Quiz của khóa học</h2>
            </div>
            {quizzes.length > 0 ? (
              <ol>
                {quizzes.map((quiz) => (
                  <li key={quiz.id}>
                    <div>
                      <strong>{quiz.title}</strong>
                      <small>Đạt từ {quiz.passingScore}%</small>
                    </div>
                    <Link to={`/quizzes/${quiz.id}/take`}>Làm quiz</Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Chưa có quiz đã xuất bản cho khóa học này.</p>
            )}
          </section>
          <section className="learning-page__assignment-card" aria-labelledby="learning-assignments-title">
            <div>
              <span>Bài tập</span>
              <h2 id="learning-assignments-title">Bài tập của khóa học</h2>
            </div>
            {assignments.length > 0 ? (
              <ol>
                {assignments.map((assignment) => (
                  <li key={assignment.id}>
                    <div>
                      <strong>{assignment.title}</strong>
                      <small>
                        {assignment.dueDate
                          ? `Hạn ${new Date(assignment.dueDate).toLocaleDateString("vi-VN")}`
                          : "Không hạn nộp"}
                      </small>
                    </div>
                    <Link to={`/assignments/${assignment.id}/submit`}>Nộp bài</Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Chưa có bài tập đã xuất bản cho khóa học này.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function LearningSkeleton() {
  return (
    <main aria-busy="true" aria-label="Đang tải bài học" className="learning-page">
      <div className="learning-page__skeleton learning-page__skeleton--top" />
      <section className="learning-page__body">
        <div className="learning-page__skeleton learning-page__skeleton--player" />
        <div className="learning-page__skeleton learning-page__skeleton--list" />
      </section>
    </main>
  );
}
