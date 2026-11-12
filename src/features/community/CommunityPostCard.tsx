import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../platform/SystemText";
import {
  Heart,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import type { CommunityComment, CommunityPost } from "../../services/community.service";
import { communityService, getCommunityErrorMessage } from "../../services/community.service";

interface CommunityPostCardProps {
  isAuthenticated: boolean;
  post: CommunityPost;
  currentUserId?: string;
  onDeleted: (postId: string) => void;
  onUpdated: (post: CommunityPost) => void;
}

export function CommunityPostCard({
  isAuthenticated,
  post: initialPost,
  currentUserId,
  onDeleted,
  onUpdated,
}: CommunityPostCardProps) {
  const messageForUi = useSystemMessages();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLiked, setIsLiked] = useState(initialPost.viewerHasLiked);
  const [reactionCount, setReactionCount] = useState(initialPost.reactionCount);
  const [commentCount, setCommentCount] = useState(initialPost.commentCount);
  const [isLikePending, setIsLikePending] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isCommentPending, setIsCommentPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = currentUserId === post.author.id;

  async function toggleComments() {
    if (isCommentsOpen) {
      setIsCommentsOpen(false);
      return;
    }

    setIsCommentsOpen(true);
    setErrorMessage(null);
    setIsLoadingComments(true);
    try {
      setComments(await communityService.listComments(post.id));
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
    } finally {
      setIsLoadingComments(false);
    }
  }

  async function toggleLike() {
    if (!isAuthenticated || isLikePending) return;
    setErrorMessage(null);
    setIsLikePending(true);
    try {
      if (isLiked) await communityService.unlikePost(post.id);
      else await communityService.likePost(post.id);
      setIsLiked((value) => !value);
      setReactionCount((value) => Math.max(0, value + (isLiked ? -1 : 1)));
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
    } finally {
      setIsLikePending(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || isCommentPending) return;

    setErrorMessage(null);
    setIsCommentPending(true);
    try {
      const comment = await communityService.createComment(post.id, content, replyTo ?? undefined);
      setComments((current) => [...current, comment]);
      setCommentCount((value) => value + 1);
      setCommentText("");
      setReplyTo(null);
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
    } finally {
      setIsCommentPending(false);
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTitle.trim() || !editContent.trim() || isSaving) return;

    setErrorMessage(null);
    setIsSaving(true);
    try {
      const updatedPost = await communityService.updatePost(post.id, {
        title: editTitle,
        content: editContent,
      });
      setPost(updatedPost);
      onUpdated(updatedPost);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này không?")) return;
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await communityService.deletePost(post.id);
      onDeleted(post.id);
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
      setIsDeleting(false);
    }
  }

  async function deleteComment(commentId: string) {
    setErrorMessage(null);
    const removedCount = comments.filter(
      (comment) => comment.id === commentId || comment.parentId === commentId,
    ).length;

    try {
      await communityService.deleteComment(commentId);
      setComments((current) =>
        current.filter(
          (comment) => comment.id !== commentId && comment.parentId !== commentId,
        ),
      );
      setCommentCount((value) => Math.max(0, value - removedCount));
    } catch (error) {
      setErrorMessage(getCommunityErrorMessage(error));
    }
  }

  return (
    <article className="community-post-card">
      <header className="community-post-card__header">
        <div className="community-post-card__author">
          <span className="community-post-card__avatar">
            {post.author.avatarUrl ? <img alt="" src={post.author.avatarUrl} /> : <UserRound aria-hidden="true" />}
          </span>
          <div>
            <strong>{post.author.fullName}</strong>
            <time dateTime={post.createdAt}><SystemValue render={() => (formatPostDate(post.createdAt))} /></time>
          </div>
        </div>
        {isAuthenticated && isOwner ? (
          <div className="community-post-card__menu">
            <button aria-label={messageForUi("Tùy chọn bài viết")} className="community-icon-button" type="button">
              <MoreHorizontal aria-hidden="true" />
            </button>
            <div className="community-post-card__actions">
              <button onClick={() => setIsEditing(true)} type="button"><Pencil aria-hidden="true" /> <SystemText message={"Sửa bài"} /></button>
              <button disabled={isDeleting} onClick={deletePost} type="button"><Trash2 aria-hidden="true" /> <SystemText message={"Xóa bài"} /></button>
            </div>
          </div>
        ) : null}
      </header>

      {isEditing ? (
        <form className="community-post-card__edit" onSubmit={savePost}>
          <label className="community-field"><span><SystemText message="Tiêu đề" /></span><input maxLength={180} onChange={(event) => setEditTitle(event.target.value)} value={editTitle} /></label>
          <label className="community-field"><span><SystemText message="Nội dung" /></span><textarea maxLength={10000} onChange={(event) => setEditContent(event.target.value)} rows={5} value={editContent} /></label>
          <div className="community-post-card__edit-actions">
            <button className="community-button community-button--quiet" onClick={() => setIsEditing(false)} type="button"><X aria-hidden="true" />{" "}<SystemText message="Hủy" /></button>
            <button className="community-button community-button--primary" disabled={isSaving} type="submit">{isSaving ? <SystemText message={"Đang lưu..."} /> : <SystemText message={"Lưu thay đổi"} />}</button>
          </div>
        </form>
      ) : (
        <div className="community-post-card__body">
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </div>
      )}

      {errorMessage ? <p className="community-form-error community-post-card__error" role="alert">{errorMessage}</p> : null}
      <footer className="community-post-card__footer">
        <button className={`community-post-action ${isLiked ? "community-post-action--active" : ""}`} disabled={!isAuthenticated || isLikePending} onClick={toggleLike} type="button">
          {isLikePending ? <LoaderCircle aria-hidden="true" className="community-spin" /> : <Heart aria-hidden="true" fill={isLiked ? "currentColor" : "none"} />}
          {isLiked ? <SystemText message={"Đã thích"} /> : <SystemText message={"Thích"} />} ({reactionCount})
        </button>
        <button className="community-post-action" onClick={toggleComments} type="button">
          <MessageCircle aria-hidden="true" /> <SystemText message={"Bình luận ("} />{commentCount})
        </button>
        <time dateTime={post.updatedAt}><SystemValue render={() => (formatPostDate(post.updatedAt))} /></time>
      </footer>

      {isCommentsOpen ? (
        <section className="community-comments" aria-label={messageForUi("Bình luận bài viết")}>
          {isLoadingComments ? <p className="community-comments__status" role="status"><SystemText message={"Đang tải bình luận..."} /></p> : null}
          {!isLoadingComments && comments.length === 0 ? <p className="community-comments__status"><SystemText message="Chưa có bình luận nào." /></p> : null}
          <div className="community-comment-list">
            {comments.filter((comment) => !comment.parentId).map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} onDelete={deleteComment} onReply={setReplyTo} replies={comments.filter((reply) => reply.parentId === comment.id)} />
            ))}
          </div>
          {isAuthenticated ? (
            <form className="community-comment-form" onSubmit={submitComment}>
              {replyTo ? <button className="community-comment-form__reply" onClick={() => setReplyTo(null)} type="button"><SystemText message={"Đang trả lời một bình luận · Hủy"} /></button> : null}
              <textarea aria-label={messageForUi("Nội dung bình luận")} maxLength={2000} onChange={(event) => setCommentText(event.target.value)} placeholder={messageForUi("Viết bình luận của bạn...")} rows={3} value={commentText} />
              <button className="community-button community-button--primary" disabled={!commentText.trim() || isCommentPending} type="submit"><Send aria-hidden="true" /> {isCommentPending ? <SystemText message={"Đang gửi..."} /> : <SystemText message={"Gửi bình luận"} />}</button>
            </form>
          ) : <p className="community-comments__login"><SystemText message={"Đăng nhập để tham gia thảo luận."} /></p>}
        </section>
      ) : null}
    </article>
  );
}

function CommentItem({ comment, currentUserId, onDelete, onReply, replies }: { comment: CommunityComment; currentUserId?: string; onDelete: (commentId: string) => void; onReply: (commentId: string) => void; replies: CommunityComment[] }) {
  return (
    <div className="community-comment" data-comment-id={comment.id}>
      <div className="community-comment__header"><strong>{comment.author.fullName}</strong><time dateTime={comment.createdAt}><SystemValue render={() => (formatPostDate(comment.createdAt))} /></time></div>
      <p>{comment.content}</p>
      <div className="community-comment__actions">
        <button onClick={() => onReply(comment.id)} type="button"><SystemText message={"Trả lời"} /></button>
        {currentUserId === comment.author.id ? <button onClick={() => onDelete(comment.id)} type="button"><SystemText message="Xóa" /></button> : null}
      </div>
      {replies.length ? <div className="community-comment__replies">{replies.map((reply) => <CommentItem comment={reply} currentUserId={currentUserId} key={reply.id} onDelete={onDelete} onReply={onReply} replies={[]} />)}</div> : null}
    </div>
  );
}

function formatPostDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa đăng";
  return new Intl.DateTimeFormat(currentSystemLocale(), { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
