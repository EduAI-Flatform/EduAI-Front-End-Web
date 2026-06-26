import type { CourseLevel, LessonType } from "../../services/course.service";

export const courseLevelLabels: Record<CourseLevel, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export const lessonTypeLabels: Record<LessonType, string> = {
  video: "Video",
  pdf: "PDF",
  article: "Bài đọc",
};
