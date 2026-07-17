import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  FileText,
  Layers3,
  ListChecks,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getAiErrorMessage } from "../../services/ai.service";
import {
  aiToolsService,
  AiFlashcardsResponse,
  AiQuizResponse,
  AiSourceType,
  AiSummaryResponse,
} from "../../services/ai-tools.service";
import "./AiToolsPage.css";

type ToolKey = "summary" | "quiz" | "flashcards";

export function AiToolsPage() {
  const [sourceType, setSourceType] = useState<AiSourceType>("lesson");
  const [sourceId, setSourceId] = useState("");
  const [count, setCount] = useState(5);
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AiSummaryResponse | null>(null);
  const [quiz, setQuiz] = useState<AiQuizResponse | null>(null);
  const [flashcards, setFlashcards] = useState<AiFlashcardsResponse | null>(null);

  async function runTool(tool: ToolKey) {
    const trimmedId = sourceId.trim();
    if (!trimmedId) {
      setError("Vui lòng nhập ID bài học hoặc tài nguyên thư viện.");
      return;
    }

    setActiveTool(tool);
    setError(null);
    try {
      const input = { sourceType, sourceId: trimmedId, count };
      if (tool === "summary") {
        setSummary(await aiToolsService.summarize({ sourceType, sourceId: trimmedId }));
      }
      if (tool === "quiz") setQuiz(await aiToolsService.generateQuiz(input));
      if (tool === "flashcards") {
        setFlashcards(await aiToolsService.generateFlashcards(input));
      }
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setActiveTool(null);
    }
  }

  return (
    <section className="ai-tools-page">
      <header className="ai-tools-page__hero">
        <div>
          <span className="ai-tools-page__eyebrow"><Sparkles aria-hidden="true" /> AI học tập</span>
          <h1>Công cụ AI cho việc học</h1>
          <p>Tóm tắt, kiểm tra kiến thức và ôn tập nhanh hơn từ nội dung khóa học.</p>
        </div>
        <Link className="ai-tools-page__chat-link" to="/ai">Mở trợ lý AI <ArrowRight aria-hidden="true" /></Link>
      </header>

      <div className="ai-tools-page__layout">
        <div className="ai-tools-page__controls">
          <div className="ai-tools-page__section-heading">
            <BookOpen aria-hidden="true" />
            <div><h2>Chọn nội dung</h2><p>Nhập ID nguồn bạn muốn học cùng AI.</p></div>
          </div>
          <label>Loại nội dung
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value as AiSourceType)}>
              <option value="lesson">Bài học</option>
              <option value="library_resource">Tài nguyên thư viện</option>
            </select>
          </label>
          <label>ID nội dung
            <input value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder="Ví dụ: 4f8c..." />
          </label>
          <label>Số câu / thẻ (1–20)
            <input type="number" min={1} max={20} value={count} onChange={(event) => setCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} />
          </label>
          <div className="ai-tools-page__actions">
            <ToolButton icon={<FileText aria-hidden="true" />} label="Tóm tắt nội dung" tool="summary" activeTool={activeTool} onClick={runTool} />
            <ToolButton icon={<ListChecks aria-hidden="true" />} label="Tạo quiz" tool="quiz" activeTool={activeTool} onClick={runTool} />
            <ToolButton icon={<Layers3 aria-hidden="true" />} label="Tạo flashcards" tool="flashcards" activeTool={activeTool} onClick={runTool} />
          </div>
          {error ? <div className="ai-tools-page__error" role="alert"><AlertCircle aria-hidden="true" />{error}</div> : null}
        </div>

        <div className="ai-tools-page__results" aria-live="polite">
          {!summary && !quiz && !flashcards && !activeTool ? <div className="ai-tools-page__empty"><Sparkles aria-hidden="true" /><h2>Kết quả AI sẽ xuất hiện ở đây</h2><p>Chọn một công cụ để bắt đầu phiên học.</p></div> : null}
          {activeTool ? <div className="ai-tools-page__loading"><Loader2 aria-hidden="true" />Đang tạo kết quả...</div> : null}
          {summary ? <article className="ai-tools-page__result-card"><span className="ai-tools-page__result-label">Tóm tắt</span><h2>{summary.title}</h2><p>{summary.summary}</p></article> : null}
          {quiz ? <article className="ai-tools-page__result-card"><span className="ai-tools-page__result-label">Quiz · {quiz.questions.length} câu</span>{quiz.questions.map((item, index) => <div className="ai-tools-page__quiz" key={`${item.question}-${index}`}><h3>{index + 1}. {item.question}</h3><ol>{item.options.map((option) => <li className={option === item.correctAnswer ? "is-correct" : ""} key={option}>{option}</li>)}</ol>{item.explanation ? <p className="ai-tools-page__explanation">Giải thích: {item.explanation}</p> : null}</div>)}</article> : null}
          {flashcards ? <article className="ai-tools-page__result-card"><span className="ai-tools-page__result-label">Flashcards · {flashcards.flashcards.length} thẻ</span><div className="ai-tools-page__flashcards">{flashcards.flashcards.map((card) => <div className="ai-tools-page__flashcard" key={card.id}><strong>{card.front}</strong><p>{card.back}</p></div>)}</div></article> : null}
        </div>
      </div>
    </section>
  );
}

function ToolButton({ icon, label, tool, activeTool, onClick }: { icon: React.ReactNode; label: string; tool: ToolKey; activeTool: ToolKey | null; onClick: (tool: ToolKey) => void }) {
  return <button className="ai-tools-page__tool-button" type="button" disabled={activeTool !== null} onClick={() => onClick(tool)}>{activeTool === tool ? <Loader2 className="is-spinning" aria-hidden="true" /> : icon}<span>{label}</span></button>;
}
