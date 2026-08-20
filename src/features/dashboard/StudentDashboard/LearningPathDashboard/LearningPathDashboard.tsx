import { ArrowRight, BookOpenCheck, CircleAlert, CircleCheck, Clock3, PencilLine, RefreshCw, Route, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { aiLearningPathService, getLearningPathErrorMessage, type AiLearningPath, type AiLearningPathMilestone } from "../../../../services/ai-learning-path.service";
import "./LearningPathDashboard.css";

type MilestoneState = "completed" | "in-progress" | "ready" | "unavailable";
const levelLabels: Record<string, string> = { beginner: "Cơ bản", intermediate: "Trung cấp", advanced: "Nâng cao" };

export function LearningPathDashboard() {
  const [currentPath, setCurrentPath] = useState<AiLearningPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPath = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try { setCurrentPath(await aiLearningPathService.getCurrent()); }
    catch (loadError) { setCurrentPath(null); setError(getLearningPathErrorMessage(loadError)); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void loadPath(); }, [loadPath]);

  async function regenerate() {
    setIsGenerating(true);
    setError("");
    setMessage("");
    try {
      await aiLearningPathService.regenerate();
      setCurrentPath(await aiLearningPathService.getCurrent());
      setMessage("Lộ trình mới đã sẵn sàng.");
    } catch (generationError) { setError(getLearningPathErrorMessage(generationError)); }
    finally { setIsGenerating(false); }
  }

  if (isLoading) return <LearningPathLoading />;

  if (error && !currentPath) {
    return <div className="learning-path-page student-dashboard__shell container"><section className="learning-path-state" role="alert"><CircleAlert aria-hidden="true" /><h1>Chưa thể tải lộ trình</h1><p>{error}</p><button type="button" onClick={() => void loadPath()}>Thử lại</button></section></div>;
  }

  if (!currentPath) {
    return (
      <div className="learning-path-page student-dashboard__shell container">
        <LearningPathHeader />
        <section className="learning-path-state" aria-labelledby="learning-path-empty-title">
          <Target aria-hidden="true" />
          <h2 id="learning-path-empty-title">Bắt đầu từ mục tiêu của bạn</h2>
          <p>Cập nhật mục tiêu và kỹ năng muốn phát triển, sau đó để AI đề xuất một lộ trình từ các khóa học bạn có thể truy cập.</p>
          <div className="learning-path-state__actions"><Link to="/dashboard/profile">Chỉnh mục tiêu học tập</Link><button disabled={isGenerating} type="button" onClick={() => void regenerate()}>{isGenerating ? "Đang tạo lộ trình…" : "Tạo lộ trình đầu tiên"}</button></div>
          {error ? <p className="learning-path-feedback" role="alert">{error}</p> : null}
        </section>
      </div>
    );
  }

  const completedCount = currentPath.path.milestones.filter((milestone) => milestoneState(milestone) === "completed").length;
  return (
    <div className="learning-path-page student-dashboard__shell container">
      <LearningPathHeader />
      <section className="learning-path-overview" aria-label="Tóm tắt lộ trình">
        <div><span>Phiên bản {currentPath.version}</span><strong>{completedCount}/{currentPath.path.milestones.length}</strong><p>Cột mốc đã hoàn thành</p></div>
        <div className="learning-path-overview__actions"><Link to="/dashboard/profile"><PencilLine aria-hidden="true" /> Chỉnh mục tiêu</Link><button disabled={isGenerating} type="button" onClick={() => void regenerate()}><RefreshCw aria-hidden="true" />{isGenerating ? "Đang tạo lại…" : "Tạo lại lộ trình"}</button></div>
      </section>
      {error ? <p className="learning-path-feedback" role="alert">{error}</p> : null}
      {message ? <p className="learning-path-feedback learning-path-feedback--success" role="status">{message}</p> : null}
      {currentPath.path.milestones.length ? (
        <ol className="learning-path-timeline" aria-label="Các cột mốc học tập">{currentPath.path.milestones.map((milestone) => <MilestoneItem key={`${milestone.courseId}-${milestone.priority}`} milestone={milestone} />)}</ol>
      ) : (
        <section className="learning-path-state"><Target aria-hidden="true" /><h2>Chưa có khóa học phù hợp</h2><p>Hãy điều chỉnh mục tiêu hoặc kỹ năng để AI có thêm ngữ cảnh tạo lộ trình.</p><Link to="/dashboard/profile">Chỉnh mục tiêu học tập</Link></section>
      )}
    </div>
  );
}

function LearningPathHeader() {
  return <header className="learning-path-header"><div className="learning-path-header__icon"><Route aria-hidden="true" /></div><div><p>Lộ trình cá nhân hóa</p><h1>Lộ trình học tập AI</h1><span>Theo dõi từng cột mốc và tiếp tục học từ dữ liệu tiến độ thực tế.</span></div></header>;
}

function MilestoneItem({ milestone }: { milestone: AiLearningPathMilestone }) {
  const state = milestoneState(milestone);
  const status = milestoneStatus(state);
  const Icon = status.icon;
  return (
    <li className={`learning-path-milestone learning-path-milestone--${state}`}>
      <div className="learning-path-milestone__marker" aria-hidden="true">{milestone.priority}</div>
      <article>
        <div className="learning-path-milestone__heading"><div><span className="learning-path-milestone__status"><Icon aria-hidden="true" /> {status.label}</span><h2>{milestone.course?.title ?? "Khuyến nghị không còn khả dụng"}</h2></div>{milestone.course ? <span>{levelLabels[milestone.course.level] ?? milestone.course.level}</span> : null}</div>
        <p>{milestone.reason}</p>
        {milestone.course ? <>
          <div className="learning-path-milestone__progress-row"><span>Tiến độ khóa học</span><strong>{milestone.course.progressPercent}%</strong></div>
          <progress aria-label={`Tiến độ ${milestone.course.title}`} aria-valuenow={milestone.course.progressPercent} max={100} value={milestone.course.progressPercent} />
          <div className="learning-path-milestone__actions"><Link to={`/courses/${milestone.course.id}`}>Xem khóa học</Link>{milestone.course.enrollmentStatus ? <Link className="learning-path-milestone__primary-link" to={`/learning/${milestone.course.id}`} aria-label={`Tiếp tục học ${milestone.course.title}`}><BookOpenCheck aria-hidden="true" /> Tiếp tục học <ArrowRight aria-hidden="true" /></Link> : null}</div>
        </> : <p className="learning-path-milestone__unavailable"><CircleAlert aria-hidden="true" /> Khóa học đã bị ẩn, lưu trữ hoặc bạn không còn quyền truy cập. Hãy tạo lại lộ trình để nhận đề xuất mới.</p>}
      </article>
    </li>
  );
}

function LearningPathLoading() {
  return <div className="learning-path-page student-dashboard__shell container" aria-busy="true" aria-label="Đang tải lộ trình học tập"><div className="learning-path-skeleton learning-path-skeleton--header" /><div className="learning-path-skeleton learning-path-skeleton--overview" /><div className="learning-path-skeleton learning-path-skeleton--milestone" /><div className="learning-path-skeleton learning-path-skeleton--milestone" /></div>;
}

function milestoneState(milestone: AiLearningPathMilestone): MilestoneState {
  if (!milestone.available || !milestone.course) return "unavailable";
  if (milestone.course.enrollmentStatus === "completed" || milestone.course.progressPercent >= 100) return "completed";
  if (milestone.course.progressPercent > 0) return "in-progress";
  return "ready";
}

function milestoneStatus(state: MilestoneState) {
  if (state === "completed") return { icon: CircleCheck, label: "Đã hoàn thành" };
  if (state === "in-progress") return { icon: Clock3, label: "Đang học" };
  if (state === "unavailable") return { icon: CircleAlert, label: "Không khả dụng" };
  return { icon: Target, label: "Sẵn sàng" };
}
