import { SystemText, useSystemMessages } from "../platform/SystemText";
import { GdsAssistantIcon } from '../../components/brand/GdsIllustrations';
import { Bot, BookOpen, Loader2, Send, Sparkles } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  aiService,
  getAiErrorMessage,
  type AiChatResponse,
  type AiMessage,
  type AiSelectableSource,
  type AiSource,
} from "../../services/ai.service";
import "./AiChatPage.css";

interface ChatItem extends AiMessage {
  sources?: AiSource[];
  grounding?: AiChatResponse["grounding"];
}

interface CourseContext {
  id: string;
  title: string;
}

const suggestions = [
  "Giải thích gradient descent thật đơn giản",
  "Tóm tắt những điểm quan trọng của bài học",
  "Đặt cho tôi một câu hỏi để ôn tập",
];

export function AiChatPage() {
  const messageForUi = useSystemMessages();
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [courseContextId, setCourseContextId] = useState<string>();
  const [courseContexts, setCourseContexts] = useState<CourseContext[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    let active = true;
    void aiService.listSources("lesson")
      .then((sources) => {
        if (active) setCourseContexts(toCourseContexts(sources));
      })
      .catch(() => {
        if (active) setCourseContexts([]);
      });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;

    setDraft("");
    setErrorMessage(null);
    setMessages((current) => [...current, createLocalMessage("user", message)]);
    setIsSending(true);

    try {
      const response = await aiService.sendChat({
        message,
        conversationId,
        ...(courseContextId ? { contextType: "course" as const, contextId: courseContextId } : {}),
      });
      setConversationId(response.conversationId);
      setMessages((current) => [...current, {
        ...response.message,
        sources: response.sources,
        grounding: response.grounding,
      }]);
    } catch (error) {
      setErrorMessage(getAiErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function handleCourseContextChange(value: string) {
    setCourseContextId(value || undefined);
    setConversationId(undefined);
    setMessages([]);
  }

  return (
    <div className="ai-chat-page">
      <header className="ai-chat-hero">
        <div className="ai-chat-container ai-chat-hero__inner">
          <div className="ai-chat-hero__icon" aria-hidden="true"><Sparkles /></div>
          <div>
            <span className="ai-chat-eyebrow"><SystemText message={"Trợ lý học tập cá nhân"} /></span>
            <h1><SystemText message={"Học cùng GDS"} /></h1>
            <p><SystemText message={"Đặt câu hỏi, khám phá ý tưởng và hiểu bài sâu hơn với trợ lý AI của bạn."} /></p>
          </div>
          <span className="ai-chat-hero__status"><span /> <SystemText message={"Sẵn sàng hỗ trợ"} /></span>
        </div>
      </header>

      <main className="ai-chat-container ai-chat-main">
        <section className="ai-chat-shell" aria-label={messageForUi("Trò chuyện với GDS")}>
          <div className="ai-chat-messages" aria-live="polite" aria-label={messageForUi("Tin nhắn trò chuyện")}>
            {messages.length === 0 ? (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty__icon" aria-hidden="true"><GdsAssistantIcon /></div>
                <h2><SystemText message={"Bạn muốn học gì hôm nay?"} /></h2>
                <p><SystemText message={"Hỏi GDS về bài học, khái niệm khó hoặc cách ôn tập hiệu quả."} /></p>
                <div className="ai-chat-suggestions" aria-label={messageForUi("Câu hỏi gợi ý")}>
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => setDraft(suggestion)} type="button">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}
            {isSending ? (
              <div className="ai-chat-message ai-chat-message--assistant" aria-label={messageForUi("GDS đang trả lời")}>
                <span className="ai-chat-avatar" aria-hidden="true"><GdsAssistantIcon /></span>
                <div className="ai-chat-bubble ai-chat-bubble--typing"><span /><span /><span /></div>
              </div>
            ) : null}
            <div ref={endOfMessagesRef} />
          </div>

          {errorMessage ? <p className="ai-chat-error" role="alert">{errorMessage}</p> : null}

          <form className="ai-chat-composer" onSubmit={handleSubmit}>
            <label className="ai-chat-context" htmlFor="ai-chat-course-context">
              <span><SystemText message={"Ngữ cảnh học tập"} /></span>
              <select
                id="ai-chat-course-context"
                onChange={(event) => handleCourseContextChange(event.target.value)}
                value={courseContextId ?? ""}
              >
                <option value=""><SystemText message={"Tất cả nguồn bạn được phép xem"} /></option>
                {courseContexts.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label className="sr-only" htmlFor="ai-chat-input"><SystemText message={"Nhập câu hỏi cho GDS"} /></label>
            <textarea
              id="ai-chat-input"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={messageForUi("Nhập câu hỏi của bạn...")}
              rows={1}
              value={draft}
            />
            <div className="ai-chat-composer__footer">
              <span><SystemText message={"Enter để gửi · Shift + Enter để xuống dòng"} /></span>
              <button aria-label={messageForUi("Gửi câu hỏi")} disabled={!draft.trim() || isSending} type="submit">
                {isSending ? <Loader2 className="ai-chat-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                <span><SystemText message="Gửi" /></span>
              </button>
            </div>
          </form>
        </section>

        <aside className="ai-chat-aside">
          <div className="ai-chat-aside__card ai-chat-aside__card--accent">
            <BookOpen aria-hidden="true" />
            <h2><SystemText message={"Học tập có định hướng"} /></h2>
            <p><SystemText message={"GDS ưu tiên nội dung học tập được cấp quyền và hiển thị nguồn tham khảo trong câu trả lời."} /></p>
          </div>
          <div className="ai-chat-aside__card">
            <span className="ai-chat-eyebrow"><SystemText message={"Mẹo hỏi AI"} /></span>
            <ul>
              <li><SystemText message={"Nêu rõ chủ đề bạn đang học."} /></li>
              <li><SystemText message={"Cho biết trình độ hoặc mục tiêu."} /></li>
              <li><SystemText message={"Yêu cầu ví dụ khi cần hiểu sâu hơn."} /></li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

function ChatMessage({ message }: { message: ChatItem }) {
  const isAssistant = message.role === "assistant";
  return (
    <article className={`ai-chat-message ${isAssistant ? "ai-chat-message--assistant" : "ai-chat-message--user"}`}>
      {isAssistant ? <span className="ai-chat-avatar" aria-hidden="true"><GdsAssistantIcon /></span> : null}
      <div className="ai-chat-message__content">
        <span className="ai-chat-message__label">{isAssistant ? "GDS" : <SystemText message={"Bạn"} />}</span>
        <div className={`ai-chat-bubble ${isAssistant ? "ai-chat-bubble--assistant" : "ai-chat-bubble--user"}`}>
          <p>{message.content}</p>
        </div>
        {isAssistant ? <span className={`ai-chat-grounding ai-chat-grounding--${message.grounding ?? "general"}`}>
          {message.grounding === "sourced" ? <SystemText message={"Dựa trên nguồn học tập được cấp quyền"} /> : <SystemText message={"Kiến thức chung — không có nguồn học tập phù hợp"} />}
        </span> : null}
        {isAssistant && message.sources?.length ? (
          <div className="ai-chat-sources">
            <span><SystemText message={"Nguồn tham khảo"} /></span>
            {message.sources.map((source, index) => (
              <Link className="ai-chat-source" key={`${source.embeddingId}-${index}`} to={source.citationPath}>
                <span>{index + 1}</span>
                <div><strong>{source.title}</strong><small>{source.sourceType === "lesson" ? <SystemText message={"Bài học"} /> : <SystemText message={"Thư viện"} />}</small></div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function createLocalMessage(role: "user", content: string): ChatItem {
  return { id: `local-${Date.now()}`, role, content, tokenCount: null, model: null, createdAt: new Date().toISOString() };
}

function toCourseContexts(sources: AiSelectableSource[]): CourseContext[] {
  const contexts = new Map<string, CourseContext>();
  for (const source of sources) {
    if (source.sourceType === "lesson" && source.courseId && !contexts.has(source.courseId)) {
      contexts.set(source.courseId, { id: source.courseId, title: source.description || source.title });
    }
  }
  return [...contexts.values()].sort((left, right) => left.title.localeCompare(right.title, "vi"));
}
