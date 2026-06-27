import type { LessonSummary } from "../../services/course.service";
import { stitchCourseSamples } from "./course-list-samples";
import type { CourseDetailView } from "./course-detail.types";

const now = new Date(0).toISOString();

const instructorAvatarUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA5ZcKqqZ4Ca-TAh1Z8mff_qzxHgjwrYDgoIu4rtgMF5UwnKup5mxgZkKFELnIfMKNv3bas4iLUFufr9d-896N9g4NQdYrYNuewgdek--aOcWGXxPTURIT6g0hNVN0ToRToDg5yQ_smmKq-nQ8yES5mHgaRe1C-zlbFeKzN8rlJpZRf3N3ITT5dzOSd6aMDfnAyJHuefU3A0bv4kWRcAnqIipGCfOZO_h_soBss8R3m97fLmtFXyaaMM-yocBcA7iqQVGCnwN35pBtP";

export function getSampleCourseDetail(courseId: string): CourseDetailView | null {
  const sample = stitchCourseSamples.find((course) => course.id === courseId);

  if (!sample) {
    return null;
  }

  return {
    ...sample,
    lessonCount: 4,
    badge: sample.badge ?? "Advanced AI Specialization",
    durationLabel: sample.durationLabel ?? "12h Video",
    instructorAvatarUrl,
    instructorBio:
      "Chuyên gia AI với hơn 10 năm kinh nghiệm triển khai Machine Learning, Computer Vision và hệ thống học tập cá nhân hóa.",
    instructorName: sample.instructorName ?? "Dr. Sarah Chen",
    instructorTitle: "AI Research Scientist @ EduAI",
    priceLabel: sample.priceLabel ?? "Sắp mở ghi danh",
    ratingLabel: sample.ratingLabel ?? "4.9 (2,400 học viên)",
    studentCountLabel: "15,420",
  };
}

export function getSampleCourseLessons(courseId: string): LessonSummary[] {
  return [
    {
      id: `${courseId}-lesson-1`,
      courseId,
      title: "Lesson 1: History of AI",
      slug: "history-of-ai",
      type: "video",
      orderIndex: 1,
      durationMinutes: 20,
      isPreview: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${courseId}-lesson-2`,
      courseId,
      title: "Lesson 2: Basic Concepts",
      slug: "basic-concepts",
      type: "video",
      orderIndex: 2,
      durationMinutes: 25,
      isPreview: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${courseId}-lesson-3`,
      courseId,
      title: "Lesson 3: CNNs",
      slug: "convolutional-neural-networks",
      type: "article",
      orderIndex: 3,
      durationMinutes: 40,
      isPreview: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${courseId}-lesson-4`,
      courseId,
      title: "Lesson 4: RNNs",
      slug: "recurrent-neural-networks",
      type: "pdf",
      orderIndex: 4,
      durationMinutes: 40,
      isPreview: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
