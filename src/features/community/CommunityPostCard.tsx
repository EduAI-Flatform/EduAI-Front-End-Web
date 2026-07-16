import { MessageCircle, MoreHorizontal, UserRound } from "lucide-react";
import type { CommunityPost } from "../../services/community.service";

interface CommunityPostCardProps {
  post: CommunityPost;
}

export function CommunityPostCard({ post }: CommunityPostCardProps) {
  return (
    <article className="community-post-card">
      <header className="community-post-card__header">
        <div className="community-post-card__author">
          <span className="community-post-card__avatar">
            {post.author.avatarUrl ? (
              <img alt="" src={post.author.avatarUrl} />
            ) : (
              <UserRound aria-hidden="true" />
            )}
          </span>
          <div>
            <strong>{post.author.fullName}</strong>
            <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
          </div>
        </div>
        <button aria-label="Tùy chọn bài viết" className="community-icon-button" type="button">
          <MoreHorizontal aria-hidden="true" />
        </button>
      </header>
      <div className="community-post-card__body">
        <h2>{post.title}</h2>
        <p>{post.content}</p>
      </div>
      <footer className="community-post-card__footer">
        <span><MessageCircle aria-hidden="true" /> Thảo luận học tập</span>
        <span>{formatPostDate(post.updatedAt)}</span>
      </footer>
    </article>
  );
}

function formatPostDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa đăng";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
