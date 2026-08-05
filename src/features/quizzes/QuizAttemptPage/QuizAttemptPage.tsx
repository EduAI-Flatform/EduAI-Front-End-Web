import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getQuizErrorMessage,
  quizService,
  type QuestionType,
  type QuizAttemptResult,
  type StudentQuiz,
} from "../../../services/quiz.service";
import "./QuizAttemptPage.css";

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "Trắc nghiệm",
  short_answer: "Tự luận ngắn",
  true_false: "Đúng / sai",
};

export function QuizAttemptPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<StudentQuiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptResult[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const completion = useMemo(() => {
    if (!quiz || quiz.questions.length === 0) return 0;
    const answered = quiz.questions.filter((question) =>
      answers[question.id]?.trim(),
    ).length;
    return Math.round((answered / quiz.questions.length) * 100);
  }, [answers, quiz]);

  const loadQuiz = useCallback(async () => {
    if (!quizId) {
      setError("Không tìm thấy quiz.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const [quizDetail, history] = await Promise.all([
        quizService.getStudentQuiz(quizId),
        quizService.listMyAttempts(quizId),
      ]);
      setQuiz(quizDetail);
      setAttempts(history);
    } catch (loadError) {
      setError(getQuizErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  async function submitAttempt() {
    if (!quiz || !quizId) return;

    if (result) {
      setResult(null);
      setAnswers({});
      setFormError(null);
      return;
    }

    const missingQuestion = quiz.questions.find(
      (question) => !answers[question.id]?.trim(),
    );
    if (missingQuestion) {
      setFormError("Vui lòng trả lời đầy đủ câu hỏi trước khi nộp bài.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const nextResult = await quizService.submitAttempt(quizId, {
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          answer: normalizeAnswer(question.type, answers[question.id]),
        })),
      });
      setResult(nextResult);
      setAttempts((current) => [nextResult, ...current]);
    } catch (submitError) {
      setFormError(getQuizErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="quiz-attempt-page" aria-busy="true" aria-label="Đang tải quiz">
        <div className="quiz-attempt-page__skeleton quiz-attempt-page__skeleton--hero" />
        <div className="quiz-attempt-page__skeleton quiz-attempt-page__skeleton--body" />
      </main>
    );
  }

  if (error || !quiz) {
    return (
      <main className="quiz-attempt-page">
        <section className="quiz-attempt-state" role="alert">
          <AlertCircle aria-hidden="true" />
          <h1>Chưa thể mở quiz</h1>
          <p>{error ?? "Quiz không tồn tại hoặc bạn chưa có quyền truy cập."}</p>
          <button onClick={() => void loadQuiz()} type="button">
            Thử lại
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-attempt-page">
      <header className="quiz-attempt-hero">
        <Link to={`/learning/${quiz.courseId}`}>
          <ArrowLeft aria-hidden="true" />
          Quay lại khóa học
        </Link>
        <div>
          <span>Quiz</span>
          <h1>{quiz.title}</h1>
          <p>{quiz.description || "Hoàn thành tất cả câu hỏi để nhận điểm tự động."}</p>
        </div>
        <aside aria-label="Tiến độ làm bài">
          <strong>{completion}%</strong>
          <span>{quiz.questions.length} câu hỏi</span>
        </aside>
      </header>

      <section className="quiz-attempt-layout">
        <form
          className="quiz-attempt-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAttempt();
          }}
        >
          {quiz.questions.map((question, index) => (
            <article className="quiz-question-card" key={question.id}>
              <div className="quiz-question-card__top">
                <span>Câu {index + 1}</span>
                <small>{questionTypeLabels[question.type]} · {question.points} điểm</small>
              </div>
              <h2>{question.questionText}</h2>
              <QuestionAnswer
                disabled={Boolean(result)}
                onChange={(value) =>
                  setAnswers((current) => ({ ...current, [question.id]: value }))
                }
                options={normalizeOptions(question.optionsJson)}
                type={question.type}
                value={answers[question.id] ?? ""}
              />
              {result?.answers ? (
                <small
                  className={
                    result.answers.find((answer) => answer.questionId === question.id)
                      ?.isCorrect
                      ? "quiz-answer-feedback quiz-answer-feedback--correct"
                      : "quiz-answer-feedback quiz-answer-feedback--incorrect"
                  }
                >
                  {result.answers.find((answer) => answer.questionId === question.id)
                    ?.isCorrect
                    ? "Đúng"
                    : "Chưa đúng"}
                </small>
              ) : null}
            </article>
          ))}

          {formError ? (
            <p className="quiz-attempt-form__alert" role="alert">
              {formError}
            </p>
          ) : null}

          <button className="quiz-attempt-form__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Send aria-hidden="true" />}
            {isSubmitting ? "Đang chấm điểm..." : result ? "Làm lại" : "Nộp bài"}
          </button>
        </form>

        <aside className="quiz-result-panel" aria-label="Kết quả quiz">
          {result ? (
            <div className={`quiz-result-card quiz-result-card--${result.passed ? "passed" : "failed"}`}>
              {result.passed ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
              <span>Kết quả gần nhất</span>
              <strong>{Math.round(result.scorePercent)}%</strong>
              <p>
                {result.score}/{result.maxScore} điểm · {result.passed ? "Đạt" : "Chưa đạt"}
              </p>
            </div>
          ) : (
            <div className="quiz-result-card">
              <ClipboardList aria-hidden="true" />
              <span>Chưa nộp bài</span>
              <strong>{quiz.passingScore}%</strong>
              <p>Điểm cần đạt để vượt qua quiz này.</p>
            </div>
          )}

          <section className="quiz-history">
            <h2>Lịch sử làm bài</h2>
            {attempts.length > 0 ? (
              <ol>
                {attempts.slice(0, 5).map((attempt) => (
                  <li key={attempt.id}>
                    <span>{Math.round(attempt.scorePercent)}%</span>
                    <small>{attempt.passed ? "Đạt" : "Chưa đạt"}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Chưa có lượt làm bài nào.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function QuestionAnswer({
  disabled,
  onChange,
  options,
  type,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  options: string[];
  type: QuestionType;
  value: string;
}) {
  if (type === "true_false") {
    return (
      <div className="quiz-answer-options quiz-answer-options--compact">
        {[
          { label: "Đúng", value: "true" },
          { label: "Sai", value: "false" },
        ].map((option) => (
          <label key={option.value}>
            <input
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              type="radio"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === "multiple_choice" && options.length > 0) {
    return (
      <div className="quiz-answer-options">
        {options.map((option) => (
          <label key={option}>
            <input
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option)}
              type="radio"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <label className="quiz-answer-text">
      <span>Câu trả lời</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nhập câu trả lời của bạn"
        readOnly={disabled}
        rows={4}
        value={value}
      />
    </label>
  );
}

function normalizeOptions(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeAnswer(type: QuestionType, value: string): unknown {
  if (type === "true_false") return value === "true";
  return value.trim();
}

