import type { CourseSummary } from "../../services/course.service";

export interface CourseListItem extends CourseSummary {
  badge?: string;
  durationLabel?: string;
  instructorName?: string;
  priceLabel?: string;
  ratingLabel?: string;
  detailPath?: string;
}
