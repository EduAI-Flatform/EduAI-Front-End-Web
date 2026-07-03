import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  getQuizErrorMessage,
  quizService,
  type QuestionMutationInput,
  type QuestionSummary,
  type QuestionType,
  type QuizMutationInput,
  type QuizStatus,
  type QuizSummary,
} from "../../../../services/quiz.service";
import "./InstructorQuizManagementPage.css";

const statusLabels: Record<QuizStatus, string> = {
  archived: "Đã lưu trữ",
  draft: "Bản nháp",
  published: "Đã xuất bản",
};

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "Trắc nghiệm",
  short_answer: "Tự luận ngắn",
  true_false: "Đúng / sai",
};

export function InstructorQuizManagementPage({ courseId }: { courseId: string }) {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [mutatingQuizId, setMutatingQuizId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) ?? null,
    [quizzes, selectedQuizId],
  );

  const loadQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedQuizzes = await quizService.listCourseQuizzes(courseId);
      setQuizzes(loadedQuizzes);
      setSelectedQuizId((current) => current ?? loadedQuizzes[0]?.id ?? null);
    } catch (loadError) {
      setError(getQuizErrorMessage(loadError));
      setQuizzes([]);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const loadQuestions = useCallback(async () => {
    if (!selectedQuizId) {
      setQuestions([]);
      return;
    }

    try {
      setQuestions(await quizService.listQuestions(selectedQuizId));
    } catch (loadError) {
      setError(getQuizErrorMessage(loadError));
      setQuestions([]);
    }
  }, [selectedQuizId]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  async function createQuiz(input: QuizMutationInput) {
    setIsSavingQuiz(true);
    setFormError(null);

    try {
      const created = await quizService.createQuiz(courseId, input);
      setQuizzes((current) => [created, ...current]);
      setSelectedQuizId(created.id);
    } catch (saveError) {
      setFormError(getQuizErrorMessage(saveError));
    } finally {
      setIsSavingQuiz(false);
    }
  }

  async function createQuestion(input: QuestionMutationInput) {
    if (!selectedQuizId) return;
    setIsSavingQuestion(true);
    setFormError(null);

    try {
      const created = await quizService.createQuestion(selectedQuizId, input);
      setQuestions((current) => [...current, created].sort(byQuestionOrder));
    } catch (saveError) {
      setFormError(getQuizErrorMessage(saveError));
    } finally {
      setIsSavingQuestion(false);
    }
  }

  async function publishQuiz(quizId: string) {
    setMutatingQuizId(quizId);
    setFormError(null);

    try {
      const published = await quizService.publishQuiz(quizId);
      setQuizzes((current) =>
        current.map((quiz) => (quiz.id === quizId ? published : quiz)),
      );
    } catch (publishError) {
      setFormError(getQuizErrorMessage(publishError));
    } finally {
      setMutatingQuizId(null);
    }
  }

  async function deleteQuiz(quizId: string) {
    const confirmed = window.confirm("Lưu trữ quiz này?");
    if (!confirmed) return;

    setMutatingQuizId(quizId);
    setFormError(null);

    try {
      await quizService.deleteQuiz(quizId);
      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === quizId ? { ...quiz, status: "archived" } : quiz,
        ),
      );
    } catch (deleteError) {
      setFormError(getQuizErrorMessage(deleteError));
    } finally {
      setMutatingQuizId(null);
    }
  }

  return (
    <div className="instructor-quiz-management">
      <header className="quiz-management-header">
        <div>
          <span>Đánh giá</span>
          <h1>Quản lý quiz</h1>
          <p>Tạo quiz, thêm câu hỏi và xuất bản cho học viên đã đăng ký.</p>
        </div>
      </header>

      {formError ? (
        <p className="quiz-management-alert" role="alert">
          {formError}
        </p>
      ) : null}

      <section className="quiz-management-layout">
        <div className="quiz-management-main">
          <QuizCreateForm isSaving={isSavingQuiz} onSubmit={createQuiz} />

          <section className="quiz-management-list" aria-labelledby="quiz-list-title">
            <header>
              <div>
                <span>Ngân hàng quiz</span>
                <h2 id="quiz-list-title">Danh sách quiz</h2>
              </div>
              <strong>{quizzes.length} quiz</strong>
            </header>

            {isLoading ? <QuizState icon={Loader2} loading message="Đang tải quiz..." /> : null}
            {!isLoading && error ? <QuizState icon={AlertCircle} message={error} tone="error" /> : null}
            {!isLoading && !error && quizzes.length === 0 ? (
              <QuizState icon={FileQuestion} message="Chưa có quiz nào cho khóa học này." />
            ) : null}

            {!isLoading && !error && quizzes.length > 0 ? (
              <div className="quiz-management-items">
                {quizzes.map((quiz) => (
                  <article
                    className={
                      selectedQuizId === quiz.id
                        ? "quiz-management-item quiz-management-item--active"
                        : "quiz-management-item"
                    }
                    key={quiz.id}
                  >
                    <button onClick={() => setSelectedQuizId(quiz.id)} type="button">
                      <span className={`quiz-management-item__status quiz-management-item__status--${quiz.status}`}>
                        {statusLabels[quiz.status]}
                      </span>
                      <strong>{quiz.title}</strong>
                      <small>
                        Điểm đạt {quiz.passingScore}% · {quiz.timeLimitMinutes ?? "Không giới hạn"} phút
                      </small>
                    </button>
                    <div>
                      {quiz.status !== "published" ? (
                        <button
                          aria-label={`Xuất bản ${quiz.title}`}
                          disabled={mutatingQuizId === quiz.id}
                          onClick={() => void publishQuiz(quiz.id)}
                          type="button"
                        >
                          <Send aria-hidden="true" />
                          Xuất bản
                        </button>
                      ) : null}
                      {quiz.status !== "archived" ? (
                        <button
                          aria-label={`Lưu trữ ${quiz.title}`}
                          disabled={mutatingQuizId === quiz.id}
                          onClick={() => void deleteQuiz(quiz.id)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" />
                          Lưu trữ
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="quiz-question-panel" aria-label="Câu hỏi quiz">
          {selectedQuiz ? (
            <>
              <div className="quiz-question-panel__title">
                <span>Câu hỏi</span>
                <h2>{selectedQuiz.title}</h2>
                <p>{questions.length} câu hỏi đã tạo</p>
              </div>
              <QuestionCreateForm
                isSaving={isSavingQuestion}
                nextOrderIndex={questions.length + 1}
                onSubmit={createQuestion}
              />
              <ol className="quiz-question-list">
                {questions.map((question) => (
                  <li key={question.id}>
                    <span>{question.orderIndex}</span>
                    <div>
                      <strong>{question.questionText}</strong>
                      <small>
                        {questionTypeLabels[question.type]} · {question.points} điểm
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <QuizState icon={FileQuestion} message="Chọn hoặc tạo quiz để thêm câu hỏi." />
          )}
        </aside>
      </section>
    </div>
  );
}

function QuizCreateForm({
  isSaving,
  onSubmit,
}: {
  isSaving: boolean;
  onSubmit: (input: QuizMutationInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState("70");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
  const [error, setError] = useState<string | null>(null);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      description: description.trim() || null,
      passingScore: Number(passingScore),
      timeLimitMinutes: timeLimitMinutes.trim()
        ? Number(timeLimitMinutes)
        : undefined,
      title: title.trim(),
    };
    const validationError = validateQuizInput(input);

    setError(validationError);
    if (validationError) return;

    await onSubmit(input);
    setTitle("");
    setDescription("");
  }

  return (
    <section className="quiz-create-form" aria-labelledby="quiz-create-title">
      <header>
        <Plus aria-hidden="true" />
        <h2 id="quiz-create-title">Tạo quiz mới</h2>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <form onSubmit={submitForm}>
        <label>
          <span>Tên quiz</span>
          <input onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label>
          <span>Mô tả</span>
          <textarea onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
        </label>
        <label>
          <span>Điểm đạt (%)</span>
          <input min="0" max="100" onChange={(event) => setPassingScore(event.target.value)} type="number" value={passingScore} />
        </label>
        <label>
          <span>Thời lượng phút</span>
          <input min="1" onChange={(event) => setTimeLimitMinutes(event.target.value)} type="number" value={timeLimitMinutes} />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Plus aria-hidden="true" />}
          {isSaving ? "Đang tạo..." : "Tạo quiz"}
        </button>
      </form>
    </section>
  );
}

function QuestionCreateForm({
  isSaving,
  nextOrderIndex,
  onSubmit,
}: {
  isSaving: boolean;
  nextOrderIndex: number;
  onSubmit: (input: QuestionMutationInput) => Promise<void>;
}) {
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState("A\nB\nC\nD");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [points, setPoints] = useState("1");
  const [error, setError] = useState<string | null>(null);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: QuestionMutationInput = {
      correctAnswerJson: normalizeCorrectAnswer(type, correctAnswer),
      optionsJson: type === "multiple_choice" ? normalizeOptionLines(options) : undefined,
      orderIndex: nextOrderIndex,
      points: Number(points),
      questionText: questionText.trim(),
      type,
    };
    const validationError = validateQuestionInput(input);

    setError(validationError);
    if (validationError) return;

    await onSubmit(input);
    setQuestionText("");
    setCorrectAnswer(type === "true_false" ? "true" : "");
  }

  return (
    <section className="question-create-form" aria-labelledby="question-create-title">
      <header>
        <CheckCircle2 aria-hidden="true" />
        <h3 id="question-create-title">Thêm câu hỏi</h3>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <form onSubmit={submitForm}>
        <label>
          <span>Loại câu hỏi</span>
          <select onChange={(event) => setType(event.target.value as QuestionType)} value={type}>
            {Object.entries(questionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Nội dung câu hỏi</span>
          <textarea onChange={(event) => setQuestionText(event.target.value)} rows={3} value={questionText} />
        </label>
        {type === "multiple_choice" ? (
          <label>
            <span>Lựa chọn, mỗi dòng một đáp án</span>
            <textarea onChange={(event) => setOptions(event.target.value)} rows={4} value={options} />
          </label>
        ) : null}
        <label>
          <span>Đáp án đúng</span>
          {type === "true_false" ? (
            <select onChange={(event) => setCorrectAnswer(event.target.value)} value={correctAnswer}>
              <option value="true">Đúng</option>
              <option value="false">Sai</option>
            </select>
          ) : (
            <input onChange={(event) => setCorrectAnswer(event.target.value)} value={correctAnswer} />
          )}
        </label>
        <label>
          <span>Điểm</span>
          <input min="0.01" step="0.01" onChange={(event) => setPoints(event.target.value)} type="number" value={points} />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Plus aria-hidden="true" />}
          {isSaving ? "Đang thêm..." : "Thêm câu hỏi"}
        </button>
      </form>
    </section>
  );
}

function QuizState({
  icon: Icon,
  loading = false,
  message,
  tone = "neutral",
}: {
  icon: typeof FileQuestion;
  loading?: boolean;
  message: string;
  tone?: "error" | "neutral";
}) {
  return (
    <div className={`quiz-management-state quiz-management-state--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" className={loading ? "is-spinning" : undefined} />
      <p>{message}</p>
    </div>
  );
}

function validateQuizInput(input: QuizMutationInput): string | null {
  if (!input.title) return "Vui lòng nhập tên quiz.";
  if (input.passingScore < 0 || input.passingScore > 100) {
    return "Điểm đạt phải từ 0 đến 100.";
  }
  if (input.timeLimitMinutes !== undefined && input.timeLimitMinutes < 1) {
    return "Thời lượng phải lớn hơn 0.";
  }
  return null;
}

function validateQuestionInput(input: QuestionMutationInput): string | null {
  if (!input.questionText) return "Vui lòng nhập nội dung câu hỏi.";
  if (input.type === "multiple_choice" && (!input.optionsJson || input.optionsJson.length < 2)) {
    return "Câu trắc nghiệm cần ít nhất 2 lựa chọn.";
  }
  if (input.correctAnswerJson === "") return "Vui lòng nhập đáp án đúng.";
  if (!Number.isFinite(input.points) || input.points <= 0) return "Điểm phải lớn hơn 0.";
  return null;
}

function normalizeOptionLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function normalizeCorrectAnswer(type: QuestionType, value: string): unknown {
  if (type === "true_false") return value === "true";
  return value.trim();
}

function byQuestionOrder(first: QuestionSummary, second: QuestionSummary) {
  return first.orderIndex - second.orderIndex;
}

