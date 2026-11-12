import { SystemText } from '@/features/platform/SystemText';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getQuizErrorMessage, quizService, type QuizSummary } from "../../../../../services/quiz.service";
import { usePlatform } from "../../../../platform/PlatformProvider";

export function LessonQuizPicker({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const { t } = usePlatform();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(Boolean(lessonId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    setLoading(true);
    void quizService.listCourseQuizzes(courseId).then((items) => { if (active) setQuizzes(items); })
      .catch((cause) => { if (active) setError(getQuizErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, lessonId]);
  async function attach() {
    if (!lessonId || !selected) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const updated = await quizService.attachToLesson(selected, lessonId);
      setQuizzes((items) => items.map((item) => item.id === updated.id ? updated : item));
      setMessage(t("Đã gắn quiz với bài học.", "Quiz attached to this lesson."));
      setSelected("");
    } catch (cause) { setError(getQuizErrorMessage(cause)); }
    finally { setSaving(false); }
  }
  return <section className="lesson-management-form__wide lesson-media-upload" aria-label={t("Quiz cuối video", "Post-video quiz")}>
    <strong>{t("Quiz cuối video", "Post-video quiz")}</strong>
    {!lessonId ? <p>{t("Lưu bài học trước để tạo hoặc gắn quiz.", "Save this lesson before creating or attaching a quiz.")}</p> : <>
      <label><span>{t("Chọn quiz có sẵn", "Select an existing quiz")}</span><select disabled={loading || saving} onChange={(event) => setSelected(event.target.value)} value={selected}>
        <option value="">{loading ? t("Đang tải...", "Loading...") : t("Chọn quiz", "Select a quiz")}</option>
        {quizzes.filter((quiz) => !quiz.lessonId).map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
      </select></label>
      <button disabled={!selected || saving} onClick={() => void attach()} type="button">{t("Gắn quiz", "Attach quiz")}</button>
      {quizzes.filter((quiz) => quiz.lessonId === lessonId).map((quiz) => <p key={quiz.id}>{quiz.title} · {quiz.status === "published" ? t("Đã xuất bản", "Published") : t("Chưa xuất bản", "Unpublished")}</p>)}
      <Link to={`/instructor/dashboard/courses/${courseId}/quizzes?lesson=${encodeURIComponent(lessonId)}`}>{t("Tạo quiz cho bài học này", "Create a quiz for this lesson")}</Link>
    </>}
    {error ? <p role="alert"><SystemText message={error} /></p> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
