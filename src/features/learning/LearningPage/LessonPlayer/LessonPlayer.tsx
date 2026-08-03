import {
  BookOpen,
  CheckCircle2,
  FileText,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type {
  LessonDetail,
  LessonType,
} from "../../../../services/course.service";
import "./LessonPlayer.css";

interface LessonPlayerProps {
  actionMessage: string | null;
  isComplete: boolean;
  isCompleting: boolean;
  isLoading: boolean;
  lesson: LessonDetail | null;
  loadError: string | null;
  onComplete: () => void;
}

const lessonTypeCopy: Record<
  LessonType,
  { icon: typeof PlayCircle; label: string; title: string; description: string }
> = {
  video: {
    icon: PlayCircle,
    label: "Video",
    title: "Trình phát video bài học",
    description: "Video bài học sẽ hiển thị tại đây khi tài nguyên được xuất bản.",
  },
  pdf: {
    icon: FileText,
    label: "PDF",
    title: "Tài liệu bài học",
    description: "Tệp PDF sẽ hiển thị tại đây khi tài nguyên được xuất bản.",
  },
  article: {
    icon: BookOpen,
    label: "Bài viết",
    title: "Nội dung bài viết",
    description: "Nội dung bài học sẽ hiển thị tại đây khi được xuất bản.",
  },
};

export function LessonPlayer({
  actionMessage,
  isComplete,
  isCompleting,
  isLoading,
  lesson,
  loadError,
  onComplete,
}: LessonPlayerProps) {
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Đang tải nội dung bài học"
        className="lesson-player lesson-player--empty"
      >
        <BookOpen aria-hidden="true" />
        <h2>Đang tải nội dung bài học...</h2>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="lesson-player lesson-player--empty" role="alert">
        <FileText aria-hidden="true" />
        <h2>Chưa thể tải nội dung bài học</h2>
        <p>{loadError}</p>
      </section>
    );
  }

  if (!lesson) {
    return (
      <section className="lesson-player lesson-player--empty">
        <BookOpen aria-hidden="true" />
        <h2>Chưa có bài học</h2>
        <p>Khóa học này chưa có bài học công khai để tiếp tục.</p>
      </section>
    );
  }

  const lessonType = lessonTypeCopy[lesson.type];

  return (
    <section className="lesson-player">
      <div className="lesson-player__stage">
        <span>{lessonType.label}</span>
        <LessonContent lesson={lesson} />
      </div>

      <div className="lesson-player__content">
        <div>
          <span>Bài {lesson.orderIndex}</span>
          <h2>{lesson.title}</h2>
          <p>
            {lesson.durationMinutes
              ? `${lesson.durationMinutes} phút học tập`
              : "Thời lượng sẽ được cập nhật"}
          </p>
        </div>

        <div className="lesson-player__ai-note">
          <Sparkles aria-hidden="true" />
          <p>Trợ lý AI có thể hỗ trợ tóm tắt và giải thích nội dung ở các bước sau.</p>
        </div>

        <div className="lesson-player__actions">
          <button
            disabled={isComplete || isCompleting}
            onClick={onComplete}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" />
            {isComplete
              ? "Đã hoàn thành"
              : isCompleting
                ? "Đang cập nhật"
                : "Đánh dấu hoàn thành"}
          </button>
          {actionMessage ? <p role="status">{actionMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}

function LessonContent({ lesson }: { lesson: LessonDetail }) {
  if (lesson.type === "video" && lesson.videoUrl) {
    return (
      <video controls preload="metadata" src={lesson.videoUrl}>
        Trình duyệt của bạn không hỗ trợ phát video.
      </video>
    );
  }

  if (lesson.type === "pdf" && lesson.documentUrl) {
    return (
      <>
        <FileText aria-hidden="true" />
        <h2>Tài liệu bài học</h2>
        <a href={lesson.documentUrl} rel="noreferrer" target="_blank">
          Mở tài liệu trong thẻ mới
        </a>
      </>
    );
  }

  if (lesson.content) {
    return (
      <article className="lesson-player__article">
        <BookOpen aria-hidden="true" />
        <h2>Nội dung bài học</h2>
        {lesson.content.split(/\n{2,}/).map((paragraph, index) => (
          <p key={`${lesson.id}-${index}`}>{paragraph}</p>
        ))}
      </article>
    );
  }

  const lessonType = lessonTypeCopy[lesson.type];
  const LessonIcon = lessonType.icon;

  return (
    <>
      <LessonIcon aria-hidden="true" />
      <h2>{lessonType.title}</h2>
      <p>{lessonType.description}</p>
    </>
  );
}
