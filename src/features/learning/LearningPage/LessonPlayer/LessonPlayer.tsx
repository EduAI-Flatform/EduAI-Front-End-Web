import {
  BookOpen,
  CheckCircle2,
  FileText,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type {
  LessonSummary,
  LessonType,
} from "../../../../services/course.service";
import "./LessonPlayer.css";

interface LessonPlayerProps {
  actionMessage: string | null;
  isComplete: boolean;
  isCompleting: boolean;
  lesson: LessonSummary | null;
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
  lesson,
  onComplete,
}: LessonPlayerProps) {
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
  const LessonIcon = lessonType.icon;

  return (
    <section className="lesson-player">
      <div className="lesson-player__stage">
        <span>{lessonType.label}</span>
        <LessonIcon aria-hidden="true" />
        <h2>{lessonType.title}</h2>
        <p>{lessonType.description}</p>
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
