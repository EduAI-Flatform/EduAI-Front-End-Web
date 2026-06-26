import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CourseDetailHero } from "./CourseDetailHero/CourseDetailHero";
import { CourseDetailSkeleton } from "./CourseDetailSkeleton/CourseDetailSkeleton";
import { CourseDetailState } from "./CourseDetailState/CourseDetailState";
import { CourseEnrollCard } from "./CourseEnrollCard/CourseEnrollCard";
import { CourseLessons } from "./CourseLessons/CourseLessons";
import { CourseSideInfo } from "./CourseSideInfo/CourseSideInfo";
import {
  getSampleCourseDetail,
  getSampleCourseLessons,
} from "./course-detail-samples";
import type { CourseDetailView } from "./course-detail.types";
import { courseLevelLabels } from "./course-display";
import {
  courseService,
  getCourseErrorMessage,
  type LessonSummary,
} from "../../services/course.service";
import "./CourseDetailPage.css";

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseDetailView | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourseDetail() {
      if (!courseId) {
        setErrorMessage("Không tìm thấy mã khóa học.");
        setIsLoading(false);
        return;
      }

      const sampleCourse = getSampleCourseDetail(courseId);

      if (sampleCourse) {
        setCourse(sampleCourse);
        setLessons(getSampleCourseLessons(courseId));
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      try {
        const [courseDetail, courseLessons] = await Promise.all([
          courseService.getCourse(courseId),
          courseService.listCourseLessons(courseId),
        ]);

        if (isMounted) {
          setCourse(courseDetail);
          setLessons(courseLessons);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getCourseErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourseDetail();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  if (isLoading) {
    return <CourseDetailSkeleton />;
  }

  if (errorMessage || !course) {
    return (
      <CourseDetailState
        message={
          errorMessage ||
          "Khóa học không tồn tại hoặc chưa được xuất bản công khai."
        }
      />
    );
  }

  return (
    <main className="course-detail-page">
      <CourseDetailHero course={course} />

      <section className="course-detail-stats-bar" aria-label="Thông tin khóa học">
        <div className="container course-detail-stats-bar__grid">
          <div>
            <span>Học viên</span>
            <strong>{course.studentCountLabel ?? "Mới mở"}</strong>
          </div>
          <div>
            <span>Bài học</span>
            <strong>{course.lessonCount} Lessons</strong>
          </div>
          <div>
            <span>Thời lượng</span>
            <strong>{course.durationLabel ?? "EduAI"}</strong>
          </div>
          <div>
            <span>Cấp độ</span>
            <strong>{courseLevelLabels[course.level]}</strong>
          </div>
        </div>
      </section>

      <section className="course-detail-body">
        <div className="container course-detail-body__grid">
          <div className="course-detail-main">
            <CourseLessons lessons={lessons} />
          </div>
          <aside className="course-detail-sidebar">
            <CourseEnrollCard course={course} />
            <CourseSideInfo course={course} />
          </aside>
        </div>
      </section>
    </main>
  );
}
