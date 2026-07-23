import { Bot, BookOpen, Loader2, Send, Sparkles } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { aiService, getAiErrorMessage, type AiMessage, type AiSource } from "../../services/ai.service";
import "./AiChatPage.css";

interface ChatItem extends AiMessage {
  sources?: AiSource[];
}

const suggestions = [
  "Giải thích gradient descent thật đơn giản",
  "Tóm tắt những điểm quan trọng của bài học",
  "Đặt cho tôi một câu hỏi để ôn tập",
];

export function AiChatPage() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;

    setDraft("");
    setErrorMessage(null);
    setMessages((current) => [...current, createLocalMessage("user", message)]);
    setIsSending(true);

    try {
      const response = await aiService.sendChat({ message, conversationId });
      setConversationId(response.conversationId);
      setMessages((current) => [...current, { ...response.message, sources: response.sources }]);
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

  return (
    <div className="ai-chat-page">
      <header className="ai-chat-hero">
        <div className="ai-chat-container ai-chat-hero__inner">
          <div className="ai-chat-hero__icon" aria-hidden="true"><Sparkles /></div>
          <div>
            <span className="ai-chat-eyebrow">Trợ lý học tập cá nhân</span>
            <h1>Học cùng EduAI</h1>
            <p>Đặt câu hỏi, khám phá ý tưởng và hiểu bài sâu hơn với trợ lý AI của bạn.</p>
          </div>
          <span className="ai-chat-hero__status"><span /> Sẵn sàng hỗ trợ</span>
        </div>
      </header>

      <main className="ai-chat-container ai-chat-main">
        <section className="ai-chat-shell" aria-label="Trò chuyện với EduAI">
          <div className="ai-chat-messages" aria-live="polite" aria-label="Tin nhắn trò chuyện">
            {messages.length === 0 ? (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty__icon" aria-hidden="true"><Bot /></div>
                <h2>Bạn muốn học gì hôm nay?</h2>
                <p>Hỏi EduAI về bài học, khái niệm khó hoặc cách ôn tập hiệu quả.</p>
                <div className="ai-chat-suggestions" aria-label="Câu hỏi gợi ý">
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
              <div className="ai-chat-message ai-chat-message--assistant" aria-label="EduAI đang trả lời">
                <span className="ai-chat-avatar" aria-hidden="true"><Bot /></span>
                <div className="ai-chat-bubble ai-chat-bubble--typing"><span /><span /><span /></div>
              </div>
            ) : null}
            <div ref={endOfMessagesRef} />
          </div>

          {errorMessage ? <p className="ai-chat-error" role="alert">{errorMessage}</p> : null}

          <form className="ai-chat-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="ai-chat-input">Nhập câu hỏi cho EduAI</label>
            <textarea
              id="ai-chat-input"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi của bạn..."
              rows={1}
              value={draft}
            />
            <div className="ai-chat-composer__footer">
              <span>Enter để gửi · Shift + Enter để xuống dòng</span>
              <button aria-label="Gửi câu hỏi" disabled={!draft.trim() || isSending} type="submit">
                {isSending ? <Loader2 className="ai-chat-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                <span>Gửi</span>
              </button>
            </div>
          </form>
        </section>

        <aside className="ai-chat-aside">
          <div className="ai-chat-aside__card ai-chat-aside__card--accent">
            <BookOpen aria-hidden="true" />
            <h2>Học tập có định hướng</h2>
            <p>EduAI ưu tiên nội dung học tập được cấp quyền và hiển thị nguồn tham khảo trong câu trả lời.</p>
          </div>
          <div className="ai-chat-aside__card">
            <span className="ai-chat-eyebrow">Mẹo hỏi AI</span>
            <ul>
              <li>Nêu rõ chủ đề bạn đang học.</li>
              <li>Cho biết trình độ hoặc mục tiêu.</li>
              <li>Yêu cầu ví dụ khi cần hiểu sâu hơn.</li>
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
      {isAssistant ? <span className="ai-chat-avatar" aria-hidden="true"><Bot /></span> : null}
      <div className="ai-chat-message__content">
        <span className="ai-chat-message__label">{isAssistant ? "EduAI" : "Bạn"}</span>
        <div className={`ai-chat-bubble ${isAssistant ? "ai-chat-bubble--assistant" : "ai-chat-bubble--user"}`}>
          <p>{message.content}</p>
        </div>
        {isAssistant && message.sources?.length ? (
          <div className="ai-chat-sources">
            <span>Nguồn tham khảo</span>
            {message.sources.map((source, index) => (
              <div className="ai-chat-source" key={`${source.embeddingId}-${index}`}>
                <span>{index + 1}</span>
                <div><strong>{source.title}</strong><small>{source.sourceType === "lesson" ? "Bài học" : "Thư viện"}</small></div>
              </div>
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
