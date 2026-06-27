import type { CourseDetail } from "../../services/course.service";

export interface CourseDetailView extends CourseDetail {
  badge?: string;
  durationLabel?: string;
  instructorAvatarUrl?: string;
  instructorBio?: string;
  instructorName?: string;
  instructorTitle?: string;
  priceLabel?: string;
  ratingLabel?: string;
  studentCountLabel?: string;
}
