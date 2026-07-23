import { ImagePlus, Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import type { CommunityPost } from "../../services/community.service";
import { communityService, getCommunityErrorMessage } from "../../services/community.service";

interface CommunityComposerProps {
  isAuthenticated: boolean;
  onCreated: (post: CommunityPost) => void;
}

export function CommunityComposer({ isAuthenticated, onCreated }: CommunityComposerProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <section className="community-login-card">
        <span className="community-login-card__icon" aria-hidden="true">
          <Sparkles />
        </span>
        <div>
          <h2>Chia sẻ điều bạn đang học</h2>
          <p>Đăng nhập để đặt câu hỏi, chia sẻ kiến thức và kết nối cùng cộng đồng.</p>
        </div>
        <Link className="community-button community-button--primary" to="/login">
          Đăng nhập để viết bài
        </Link>
      </section>
    );
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setErrorMessage("Vui lòng nhập tiêu đề và nội dung bài viết.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const post = await communityService.createPost({
        title: trimmedTitle,
        content: trimmedContent,
      });
      onCreated(post);
      setTitle("");
      setContent("");
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="community-composer" aria-labelledby="community-composer-title">
      <div className="community-composer__header">
        <div>
          <span className="community-eyebrow">Góc chia sẻ</span>
          <h2 id="community-composer-title">Bạn đang muốn thảo luận điều gì?</h2>
        </div>
        <ImagePlus aria-hidden="true" />
      </div>
      <form onSubmit={submitPost}>
        <label className="community-field">
          <span>Tiêu đề</span>
          <input
            maxLength={180}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ví dụ: Cùng ôn tập về machine learning"
            value={title}
          />
        </label>
        <label className="community-field">
          <span>Nội dung</span>
          <textarea
            maxLength={10000}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Viết câu hỏi, kinh nghiệm hoặc một ý tưởng hữu ích..."
            rows={4}
            value={content}
          />
        </label>
        {errorMessage ? <p className="community-form-error" role="alert">{errorMessage}</p> : null}
        <div className="community-composer__footer">
          <span>{content.length}/10000 ký tự</span>
          <button className="community-button community-button--primary" disabled={isSubmitting} type="submit">
            <Send aria-hidden="true" />
            {isSubmitting ? "Đang đăng..." : "Đăng bài"}
          </button>
        </div>
      </form>
    </section>
  );
}
