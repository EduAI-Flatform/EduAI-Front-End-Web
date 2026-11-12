import { SystemText, useSystemMessages } from "../../../platform/SystemText";
import { BrainCircuit, Loader2, MessageCircle, Send, Sparkles, SquareKanban } from "lucide-react";
import { useState } from "react";
import { aiService, getAiErrorMessage } from "../../../../services/ai.service";
import { aiToolsService } from "../../../../services/ai-tools.service";
import "./LessonAssistant.css";

interface LessonAssistantProps {
  lessonId: string;
  lessonTitle: string;
}

const suggestedQuestions = ["Cấu trúc neuron là gì?", "Giải thích lớp ẩn"];

export function LessonAssistant({ lessonId, lessonTitle }: LessonAssistantProps) {
  const messageForUi = useSystemMessages();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Array<{ id: string; front: string; back: string }>>([]);
  const [activeAction, setActiveAction] = useState<"ask" | "summary" | "flashcards" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function askAi() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setActiveAction("ask");
    setError(null);
    try {
      const response = await aiService.sendChat({
        message: `Trong bài học "${lessonTitle}": ${trimmedQuestion}`,
      });
      setAnswer(response.message.content);
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setActiveAction(null);
    }
  }

  async function loadSummary() {
    setActiveAction("summary");
    setError(null);
    try {
      const response = await aiToolsService.summarize({ sourceType: "lesson", sourceId: lessonId });
      setSummary(response.summary);
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setActiveAction(null);
    }
  }

  async function loadFlashcards() {
    setActiveAction("flashcards");
    setError(null);
    try {
      const response = await aiToolsService.generateFlashcards({ sourceType: "lesson", sourceId: lessonId });
      setFlashcards(response.flashcards);
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setActiveAction(null);
    }
  }

  const isBusy = activeAction !== null;

  return (
    <aside aria-label={messageForUi("Trợ lý AI cho bài học")} className="lesson-assistant">
      <div className="lesson-assistant__heading">
        <div className="lesson-assistant__icon"><Sparkles aria-hidden="true" /></div>
        <div>
          <span><SystemText message="Trợ lý AI" /></span>
          <h2><SystemText message={"Học cùng AI"} /></h2>
        </div>
      </div>

      <section className="lesson-assistant__section" aria-labelledby="lesson-assistant-ask">
        <h3 id="lesson-assistant-ask"><MessageCircle aria-hidden="true" /> <SystemText message={"Hỏi đáp AI"} /></h3>
        <div className="lesson-assistant__input">
          <input
            aria-label={messageForUi("Câu hỏi cho AI")}
            disabled={isBusy}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void askAi();
            }}
            placeholder={messageForUi("Ví dụ: Giải thích khái niệm này")}
            value={question}
          />
          <button aria-label={messageForUi("Gửi câu hỏi")} disabled={isBusy || !question.trim()} onClick={() => void askAi()} type="button">
            {activeAction === "ask" ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Send aria-hidden="true" />}
          </button>
        </div>
        <div className="lesson-assistant__suggestions">
          {suggestedQuestions.map((suggestion) => (
            <button key={suggestion} disabled={isBusy} onClick={() => setQuestion(suggestion)} type="button">
              {suggestion}
            </button>
          ))}
        </div>
        {answer ? <p className="lesson-assistant__response" role="status">{answer}</p> : null}
      </section>

      <section className="lesson-assistant__section" aria-labelledby="lesson-assistant-summary">
        <h3 id="lesson-assistant-summary"><BrainCircuit aria-hidden="true" /> <SystemText message={"Tóm tắt bài học"} /></h3>
        {summary ? <p className="lesson-assistant__response">{summary}</p> : <p className="lesson-assistant__empty"><SystemText message={"Tạo bản tóm tắt dựa trên nội dung bài học."} /></p>}
        <button className="lesson-assistant__outline-button" disabled={isBusy} onClick={() => void loadSummary()} type="button">
          {activeAction === "summary" ? <Loader2 aria-hidden="true" className="is-spinning" /> : <Sparkles aria-hidden="true" />}
          {summary ? <SystemText message={"Tạo lại tóm tắt"} /> : <SystemText message={"Tạo tóm tắt"} />}
        </button>
      </section>

      <section className="lesson-assistant__section" aria-labelledby="lesson-assistant-flashcards">
        <h3 id="lesson-assistant-flashcards"><SquareKanban aria-hidden="true" /> <SystemText message={"Thẻ ghi nhớ"} /></h3>
        {flashcards.length > 0 ? (
          <div className="lesson-assistant__flashcards">
            {flashcards.slice(0, 3).map((flashcard) => (
              <article key={flashcard.id}>
                <strong>{flashcard.front}</strong>
                <p>{flashcard.back}</p>
              </article>
            ))}
          </div>
        ) : <p className="lesson-assistant__empty"><SystemText message={"Ôn tập nhanh các khái niệm quan trọng."} /></p>}
        <button className="lesson-assistant__outline-button" disabled={isBusy} onClick={() => void loadFlashcards()} type="button">
          {activeAction === "flashcards" ? <Loader2 aria-hidden="true" className="is-spinning" /> : <SquareKanban aria-hidden="true" />}
          {flashcards.length > 0 ? <SystemText message={"Tạo lại thẻ"} /> : <SystemText message={"Tạo flashcard"} />}
        </button>
      </section>

      {error ? <p className="lesson-assistant__error" role="alert"><SystemText message={error} /></p> : null}
      <p className="lesson-assistant__presence">
        <span aria-hidden="true" />
        <SystemText message={"Trợ lý AI: Trực tuyến"} />
      </p>
    </aside>
  );
}
