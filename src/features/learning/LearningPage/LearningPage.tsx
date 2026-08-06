import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
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
  type LearningPath,
  type LearningStep,
  type UpdateLessonProgressInput,
} from "../../../services/learning.service";
import {
  getQuizErrorMessage,
  quizService,
  type QuizSummary,
} from "../../../services/quiz.service";
import { LessonNavigation } from "./LessonNavigation/LessonNavigation";
import { LessonAssistant } from "./LessonAssistant/LessonAssistant";
import { LessonPlayer } from "./LessonPlayer/LessonPlayer";
import "./LearningPage.css";

export function LearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgress = useRef<UpdateLessonProgressInput | null>(null);

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
      const [courseDetail, courseLessons, path] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.listCourseLessons(courseId),
        learningService.getLearningPath(courseId),
      ]);
      const courseQuizzes = await quizService
        .listStudentCourseQuizzes(courseId)
        .catch(() => [] as QuizSummary[]);
      const courseAssignments = await assignmentService
        .listCourseAssignments(courseId)
        .catch(() => [] as AssignmentSummary[]);

      setCourse(courseDetail);
      setLessons([...courseLessons].sort((a, b) => a.orderIndex - b.orderIndex));
      setLearningPath(path);
      setAssignments(courseAssignments);
      setQuizzes(courseQuizzes);
    } catch (error) {
      setErrorMessage(
        getCourseErrorMessage(error) ||
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

  const selectedStep = useMemo(() => {
    if (!learningPath) return null;
    const requestedId = searchParams.get("step") ?? searchParams.get("lesson");
    if (requestedId) {
      return learningPath.steps.find((step) => step.id === requestedId) ?? null;
    }
    return (
      (learningPath.currentStep?.type === "LESSON"
        ? learningPath.currentStep
        : learningPath.steps.find(
            (step) => step.type === "LESSON" && step.status !== "LOCKED",
          )) ?? null
    );
  }, [learningPath, searchParams]);

  const selectedLesson = useMemo(() => {
    if (!selectedStep || selectedStep.type !== "LESSON") return null;
    return lessons.find((lesson) => lesson.id === selectedStep.id) ?? null;
  }, [lessons, selectedStep]);

  useEffect(() => {
    if (!selectedStep || searchParams.get("step")) return;
    setSearchParams({ step: selectedStep.id }, { replace: true });
  }, [searchParams, selectedStep, setSearchParams]);

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
        if (isMounted) setLessonDetail(detail);
      } catch (error) {
        if (isMounted) {
          setLessonDetail(null);
          setLessonError(getLearningErrorMessage(error));
        }
      } finally {
        if (isMounted) setIsLoadingLesson(false);
      }
    }

    void loadLessonDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedLesson]);

  const saveProgress = useCallback(
    async (input: UpdateLessonProgressInput) => {
      if (!selectedLesson) return;
      try {
        setIsSavingProgress(true);
        const updatedPath = await learningService.updateLessonProgress(
          selectedLesson.id,
          input,
        );
        setLearningPath(updatedPath);
      } catch (error) {
        setActionMessage(getLearningErrorMessage(error));
      } finally {
        setIsSavingProgress(false);
      }
    },
    [selectedLesson],
  );

  const queueProgress = useCallback(
    (input: UpdateLessonProgressInput) => {
      pendingProgress.current = { ...pendingProgress.current, ...input };
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(() => {
        const nextProgress = pendingProgress.current;
        pendingProgress.current = null;
        if (nextProgress) void saveProgress(nextProgress);
      }, 5000);
    },
    [saveProgress],
  );

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
      const nextProgress = pendingProgress.current;
      if (nextProgress) void saveProgress(nextProgress);
    };
  }, [saveProgress]);

  function handleSelectStep(step: LearningStep) {
    if (step.status === "LOCKED") {
      setActionMessage(step.lockedReason ?? "Bước này đang bị khóa.");
      return;
    }
    setActionMessage(null);
    if (step.type === "ASSIGNMENT") {
      navigate(`/assignments/${step.id}/submit`);
    } else if (step.type === "QUIZ") {
      navigate(`/quizzes/${step.id}/take`);
    } else {
      setSearchParams({ step: step.id });
    }
  }

  function handleNextStep() {
    if (!learningPath || !selectedStep) return;
    const nextStep = learningPath.steps[learningPath.steps.indexOf(selectedStep) + 1];
    if (nextStep) handleSelectStep(nextStep);
    else setActionMessage("Bạn đã hoàn thành toàn bộ khóa học.");
  }

  function handlePreviousStep() {
    if (!learningPath || !selectedStep) return;
    const previousStep = learningPath.steps[learningPath.steps.indexOf(selectedStep) - 1];
    if (previousStep) handleSelectStep(previousStep);
  }

  if (isLoading) return <LearningSkeleton />;

  if (errorMessage || !course || !learningPath) {
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

  const selectedStepProgress = selectedStep?.progressPercent ?? 0;
  const currentNextStep = learningPath.nextStep;
  const selectedStepIndex = selectedStep ? learningPath.steps.indexOf(selectedStep) : -1;
  const hasPreviousStep = selectedStepIndex > 0;
  const hasNextStep = selectedStepIndex >= 0 && selectedStepIndex < learningPath.steps.length - 1;
  const canCompleteLesson = selectedLesson?.type !== "video" || selectedStepProgress >= 90;
  const unlockedAssignments = assignments.filter((assignment) => {
    const step = learningPath.steps.find((item) => item.id === assignment.id);
    return step && step.status !== "LOCKED";
  });
  const unlockedQuizzes = quizzes.filter((quiz) => {
    const step = learningPath.steps.find((item) => item.id === quiz.id);
    return step && step.status !== "LOCKED";
  });

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
        <strong>
          {learningPath.completedSteps}/{learningPath.totalSteps} bước · {learningPath.progressPercent}%
        </strong>
      </header>

      <section className="learning-page__body">
        <aside className="learning-page__curriculum" aria-label="Lộ trình khóa học">
          <button
            aria-expanded={isSidebarOpen}
            className="learning-page__sidebar-toggle"
            onClick={() => setIsSidebarOpen((current) => !current)}
            type="button"
          >
            {isSidebarOpen ? "Ẩn lộ trình" : "Hiện lộ trình"}
          </button>
          {isSidebarOpen ? (
            <>
              <div className="learning-page__progress-card">
                <div>
                  <span>Tiến độ khóa học</span>
                  <strong>{learningPath.progressPercent}%</strong>
                </div>
                <div
                  aria-label={`Tiến độ khóa học ${learningPath.progressPercent}%`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={learningPath.progressPercent}
                  className="learning-page__progress"
                  role="progressbar"
                >
                  <span style={{ width: `${learningPath.progressPercent}%` }} />
                </div>
                <small>{learningPath.completedSteps}/{learningPath.totalSteps} bước đã hoàn thành</small>
              </div>

              <LessonNavigation
                onSelectStep={handleSelectStep}
                selectedStepId={selectedStep?.id ?? null}
                steps={learningPath.steps}
              />

              <section className="learning-page__resource-card" aria-labelledby="learning-quizzes-title">
                <div>
                  <span>Bài kiểm tra</span>
                  <h2 id="learning-quizzes-title">Bài kiểm tra</h2>
                </div>
                {unlockedQuizzes.length > 0 ? (
                  <ol>
                    {unlockedQuizzes.map((quiz) => (
                      <li key={quiz.id}>
                        <strong>{quiz.title}</strong>
                        <Link to={`/quizzes/${quiz.id}/take`}>Làm bài</Link>
                      </li>
                    ))}
                  </ol>
                ) : <p>Chưa có bài kiểm tra khả dụng.</p>}
              </section>

              <section className="learning-page__resource-card" aria-labelledby="learning-assignments-title">
                <div>
                  <span>Bài tập</span>
                  <h2 id="learning-assignments-title">Bài tập</h2>
                </div>
                {unlockedAssignments.length > 0 ? (
                  <ol>
                    {unlockedAssignments.map((assignment) => (
                      <li key={assignment.id}>
                        <strong>{assignment.title}</strong>
                        <Link to={`/assignments/${assignment.id}/submit`}>Mở bài</Link>
                      </li>
                    ))}
                  </ol>
                ) : <p>Chưa có bài tập khả dụng.</p>}
              </section>
            </>
          ) : null}
        </aside>

        <div className="learning-page__main">
          {selectedLesson ? (
            <LessonPlayer
              actionMessage={isSavingProgress ? "Đang lưu tiến độ..." : actionMessage}
              canComplete={canCompleteLesson}
              hasNext={hasNextStep}
              hasPrevious={hasPreviousStep}
              initialPositionSeconds={selectedStep?.lastPositionSeconds ?? 0}
              isComplete={selectedStep?.status === "COMPLETED"}
              isLoading={isLoadingLesson}
              lesson={lessonDetail}
              loadError={lessonError}
              onComplete={() => {
                if (selectedLesson.type === "video") {
                  setActionMessage("Tiếp tục xem video để mở khóa hoàn thành bài học.");
                  return;
                }
                void saveProgress({ documentProgressPercent: 100 });
              }}
              onNext={handleNextStep}
              onPrevious={handlePreviousStep}
              onProgress={queueProgress}
              progressPercent={selectedStepProgress}
            />
          ) : (
            <section className="lesson-player lesson-player--empty">
              <CheckCircle2 aria-hidden="true" />
              <h2>{learningPath.completed ? "Đã hoàn thành khóa học" : "Chọn bước trong lộ trình"}</h2>
              <p>
                {currentNextStep
                  ? `Bước tiếp theo: ${currentNextStep.title}`
                  : "Bạn đã hoàn thành các bước hiện có."}
              </p>
              {currentNextStep && currentNextStep.status !== "LOCKED" ? (
                <button onClick={() => handleSelectStep(currentNextStep)} type="button">
                  Tiếp tục
                </button>
              ) : null}
            </section>
          )}

        </div>

        <aside className="learning-page__assistant" aria-label="Trợ lý AI">
          <button
            aria-expanded={isAssistantOpen}
            className="learning-page__sidebar-toggle"
            onClick={() => setIsAssistantOpen((current) => !current)}
            type="button"
          >
            {isAssistantOpen ? "Ẩn trợ lý AI" : "Hiện trợ lý AI"}
          </button>
          {isAssistantOpen && lessonDetail ? <LessonAssistant lessonId={lessonDetail.id} lessonTitle={lessonDetail.title} /> : null}
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
