import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Lightbulb,
  PlayCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { LessonDetail, LessonType } from "../../../../services/course.service";
import type { UpdateLessonProgressInput } from "../../../../services/learning.service";
import "./LessonPlayer.css";

interface LessonPlayerProps {
  actionMessage: string | null;
  canComplete?: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  isComplete: boolean;
  isLoading: boolean;
  lesson: LessonDetail | null;
  loadError: string | null;
  initialPositionSeconds: number;
  progressPercent: number;
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onProgress: (input: UpdateLessonProgressInput) => void;
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
    label: "Tài liệu",
    title: "Tài liệu bài học",
    description: "Tài liệu sẽ hiển thị tại đây khi tài nguyên được xuất bản.",
  },
  article: {
    icon: BookOpen,
    label: "Bài viết",
    title: "Nội dung bài học",
    description: "Nội dung bài học sẽ hiển thị tại đây khi được xuất bản.",
  },
};

export function LessonPlayer({
  actionMessage,
  canComplete = true,
  hasNext,
  hasPrevious,
  isComplete,
  isLoading,
  lesson,
  loadError,
  initialPositionSeconds,
  progressPercent,
  onComplete,
  onNext,
  onPrevious,
  onProgress,
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
        <p>Khóa học này chưa có bài học khả dụng để tiếp tục.</p>
      </section>
    );
  }

  const lessonType = lessonTypeCopy[lesson.type];
  const lessonParagraphs = lesson.content
    ?.split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean) ?? [];
  const lessonOverview = lessonParagraphs[0];
  const lessonTakeaway = lessonParagraphs[1];

  return (
    <section className="lesson-player">
      <div className="lesson-player__stage">
        <span>{lessonType.label}</span>
        <LessonContent
          initialPositionSeconds={initialPositionSeconds}
          lesson={lesson}
          onProgress={onProgress}
        />
      </div>

      <div className="lesson-player__content">
        <div>
          <span>Bài {lesson.orderIndex}</span>
          <h2>{lesson.title}</h2>
          <p>
            {isComplete
              ? "Đã hoàn thành"
              : progressPercent > 0
                ? `Đang học - ${progressPercent}%`
                : lesson.durationMinutes
                  ? `${lesson.durationMinutes} phút học tập`
                  : "Bắt đầu bài học để lưu tiến độ"}
          </p>
        </div>

        {lesson.type === "article" && lesson.content ? (
          <div className="lesson-player__overview">
            <div className="lesson-player__meta" aria-label="Thông tin bài học">
              {lesson.durationMinutes ? <span>{lesson.durationMinutes} phút</span> : null}
              <span>{lessonType.label}</span>
            </div>
            <article
              aria-label="Nội dung bài học"
              className="lesson-player__article lesson-player__article--reading"
              onScroll={(event) => {
                const element = event.currentTarget;
                const scrollable = element.scrollHeight - element.clientHeight;
                const percent = scrollable <= 0 ? 100 : Math.round((element.scrollTop / scrollable) * 100);
                onProgress({ documentProgressPercent: Math.min(100, Math.max(10, percent)) });
              }}
            >
              {lessonParagraphs.map((paragraph, index) => (
                <p key={`${lesson.id}-${index}`}>{paragraph}</p>
              ))}
            </article>
          </div>
        ) : lessonOverview ? (
          <div className="lesson-player__overview">
            <div className="lesson-player__meta" aria-label="Thông tin bài học">
              {lesson.durationMinutes ? <span>{lesson.durationMinutes} phút</span> : null}
              <span>{lessonType.label}</span>
            </div>
            <p>{lessonOverview}</p>
            {lessonTakeaway ? (
              <div className="lesson-player__takeaway">
                <Lightbulb aria-hidden="true" />
                <div>
                  <strong>Kiến thức trọng tâm</strong>
                  <p>{lessonTakeaway}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="lesson-player__actions">
          <div aria-live="polite" className="lesson-player__status">
            {isComplete ? (
              <>
                <CheckCircle2 aria-hidden="true" />
                <span>Đã hoàn thành bài học.</span>
              </>
            ) : (
              <span>Tiến độ được lưu tự động.</span>
            )}
          </div>
          <div className="lesson-player__navigation" aria-label="Điều hướng bài học">
            <button disabled={!hasPrevious} onClick={onPrevious} type="button">
              <ArrowLeft aria-hidden="true" />
              Bài trước
            </button>
            {!isComplete ? (
              <button disabled={!canComplete} onClick={onComplete} type="button">
                <CheckCircle2 aria-hidden="true" />
                Hoàn thành bài học
              </button>
            ) : null}
            <button disabled={!hasNext} onClick={onNext} type="button">
              Bài tiếp theo
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          {actionMessage ? <p role="status">{actionMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}

function LessonContent({
  initialPositionSeconds,
  lesson,
  onProgress,
}: {
  initialPositionSeconds: number;
  lesson: LessonDetail;
  onProgress: (input: UpdateLessonProgressInput) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const didRestorePosition = useRef(false);

  useEffect(() => {
    didRestorePosition.current = false;
  }, [lesson.id]);

  if (lesson.type === "video" && lesson.videoUrl) {
    return (
      <video
        ref={videoRef}
        controls
        onLoadedMetadata={(event) => {
          if (!didRestorePosition.current && initialPositionSeconds > 0) {
            event.currentTarget.currentTime = initialPositionSeconds;
            didRestorePosition.current = true;
          }
        }}
        onPause={(event) => {
          onProgress({
            durationSeconds: Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : undefined,
            lastPositionSeconds: event.currentTarget.currentTime,
            watchedSeconds: event.currentTarget.currentTime,
          });
        }}
        onEnded={(event) => {
          onProgress({
            durationSeconds: Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : undefined,
            lastPositionSeconds: event.currentTarget.duration,
            watchedSeconds: event.currentTarget.duration,
          });
        }}
        onTimeUpdate={(event) => {
          onProgress({
            durationSeconds: Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : undefined,
            lastPositionSeconds: event.currentTarget.currentTime,
            watchedSeconds: event.currentTarget.currentTime,
          });
        }}
        preload="metadata"
        src={lesson.videoUrl}
      >
        Trình duyệt của bạn không hỗ trợ phát video.
      </video>
    );
  }

  if (lesson.type === "pdf" && lesson.documentUrl) {
    return (
      <div className="lesson-player__document">
        <iframe
          title={`Tài liệu ${lesson.title}`}
          onLoad={() => onProgress({ documentProgressPercent: 10 })}
          src={lesson.documentUrl}
        />
        <a href={lesson.documentUrl} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden="true" />
          Mở trong tab mới
        </a>
      </div>
    );
  }

  const lessonType = lessonTypeCopy[lesson.type];
  const LessonIcon = lessonType.icon;

  return (
    <>
      <LessonIcon aria-hidden="true" />
      <h2>{lesson.type === "article" ? "Bài viết sẵn sàng" : lessonType.title}</h2>
      <p>
        {lesson.type === "article"
          ? "Đọc nội dung bài học bên dưới để tiếp tục lưu tiến độ."
          : lessonType.description}
      </p>
    </>
  );
}
