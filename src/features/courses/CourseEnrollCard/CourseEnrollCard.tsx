import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PlayCircle,
  Star,
} from "lucide-react";
import { useState } from "react";
import type { CourseDetailView } from "../course-detail.types";
import { formatCoursePrice, formatCourseRating, getCoursePriceDisplay } from "../course-display";
import type { VoucherPreview } from "../../../services/voucher.service";
import type { Scholarship } from "../../../services/scholarship.service";
import "./CourseEnrollCard.css";

interface CourseEnrollCardProps {
  course: CourseDetailView;
  enrollmentError: string | null;
  isEnrolled: boolean;
  isEnrollmentLoading: boolean;
  isSubmitting: boolean;
  isCartLoading: boolean;
  isAuthenticated: boolean;
  isVoucherLoading: boolean;
  voucherError: string | null;
  voucherPreview: VoucherPreview | null;
  onEnroll: () => void;
  onPreview: () => void;
  onVoucherPreview: (code: string) => void;
  scholarships: Scholarship[];
  appliedScholarshipIds: string[];
  isScholarshipLoading: boolean;
  scholarshipError: string | null;
  onScholarshipApply: (scholarshipId: string) => void;
}

export function CourseEnrollCard({
  course,
  enrollmentError,
  isEnrolled,
  isEnrollmentLoading,
  isSubmitting,
  isCartLoading,
  isAuthenticated,
  isVoucherLoading,
  voucherError,
  voucherPreview,
  onEnroll,
  onPreview,
  onVoucherPreview,
  scholarships,
  appliedScholarshipIds,
  isScholarshipLoading,
  scholarshipError,
  onScholarshipApply,
}: CourseEnrollCardProps) {
  const [voucherCode, setVoucherCode] = useState("");
  const priceDisplay = getCoursePriceDisplay(course.price, {
    status: course.status,
  });
  let buttonLabel = "Đăng ký học";

  if (isEnrollmentLoading) {
    buttonLabel = "Đang kiểm tra...";
  } else if (isSubmitting) {
    buttonLabel = "Đang ghi danh...";
  } else if (isEnrolled) {
    buttonLabel = "Tiếp tục học";
  } else if ((course.price?.amountMinor ?? 0) > 0) {
    buttonLabel = isCartLoading ? "Đang thêm vào giỏ..." : "Thêm vào giỏ hàng";
  }

  return (
    <section className="course-detail-enroll" aria-label="Đăng ký khóa học">
      <div className="course-detail-enroll__price">
        {priceDisplay.originalLabel ? <del>{priceDisplay.originalLabel}</del> : null}
        <span>{priceDisplay.finalLabel}</span>
        {priceDisplay.promotionLabel ? <small>{priceDisplay.promotionLabel}</small> : null}
        <small>{formatCourseRating(course.metrics)}</small>
      </div>
      {isEnrolled ? (
        <p className="course-detail-enroll__status" role="status">
          <CheckCircle2 aria-hidden="true" />
          Bạn đã đăng ký khóa học này.
        </p>
      ) : null}
      {enrollmentError ? (
        <p className="course-detail-enroll__error" role="alert">
          <AlertCircle aria-hidden="true" />
          {enrollmentError}
        </p>
      ) : null}
      {!isEnrolled && isAuthenticated ? (
        <form
          className="course-detail-enroll__voucher"
          onSubmit={(event) => {
            event.preventDefault();
            if (voucherCode.trim()) onVoucherPreview(voucherCode);
          }}
        >
          <label htmlFor="course-voucher-code">Mã voucher</label>
          <div className="course-detail-enroll__voucher-row">
            <input
              aria-describedby="course-voucher-hint"
              id="course-voucher-code"
              onChange={(event) => setVoucherCode(event.target.value)}
              placeholder="Nhập mã ưu đãi"
              value={voucherCode}
            />
            <button disabled={isVoucherLoading || !voucherCode.trim()} type="submit">
              {isVoucherLoading ? "Đang kiểm tra" : "Áp dụng"}
            </button>
          </div>
          <small id="course-voucher-hint">Giá sau voucher do hệ thống xác nhận.</small>
        </form>
      ) : null}
      {voucherError ? (
        <p className="course-detail-enroll__error" role="alert">
          <AlertCircle aria-hidden="true" />
          {voucherError}
        </p>
      ) : null}
      {voucherPreview?.eligible ? (
        <p className="course-detail-enroll__voucher-result" role="status">
          <CheckCircle2 aria-hidden="true" />
          Giảm {formatCoursePrice({ amountMinor: voucherPreview.discountAmountMinor, currency: voucherPreview.currency })}
          <strong>
            Giá sau voucher: {formatCoursePrice({ amountMinor: voucherPreview.finalAmountMinor, currency: voucherPreview.currency })}
          </strong>
        </p>
      ) : null}
      {!isEnrolled && isAuthenticated ? (
        <section className="course-detail-enroll__scholarships" aria-label="Học bổng áp dụng">
          <div><strong>Học bổng phù hợp</strong><small>Không tự động ghi danh hoặc thanh toán.</small></div>
          {isScholarshipLoading ? <p role="status">Đang tải học bổng...</p> : null}
          {scholarshipError ? <p className="course-detail-enroll__error" role="alert">{scholarshipError}</p> : null}
          {!isScholarshipLoading && !scholarshipError && !scholarships.length ? <p>Hiện chưa có học bổng phù hợp.</p> : null}
          {scholarships.map((scholarship) => {
            const applied = appliedScholarshipIds.includes(scholarship.id);
            return <article className="course-detail-enroll__scholarship" key={scholarship.id}><div><strong>{scholarship.title}</strong><small>{scholarship.benefitKind === "course_access" ? "Quyền truy cập khóa học" : `${scholarship.benefitValue}${scholarship.benefitKind === "percentage_discount" ? "%" : ` ${scholarship.currency ?? ""}`}`}</small></div><button disabled={applied || isScholarshipLoading} onClick={() => onScholarshipApply(scholarship.id)} type="button">{applied ? "Đã đăng ký" : "Đăng ký"}</button></article>;
          })}
        </section>
      ) : null}
      <button
        className="course-detail-enroll__button"
        disabled={isEnrollmentLoading || isSubmitting || isCartLoading}
        onClick={onEnroll}
        type="button"
      >
        {isEnrollmentLoading || isSubmitting || isCartLoading ? (
          <LoaderCircle aria-hidden="true" className="course-detail-enroll__spinner" />
        ) : null}
        {buttonLabel}
      </button>
      <button className="course-detail-enroll__preview" onClick={onPreview} type="button">
        <PlayCircle aria-hidden="true" />
        Xem bài học thử
      </button>
      <ul className="course-detail-enroll__features">
        <li>
          <CheckCircle2 aria-hidden="true" />
          Truy cập toàn bộ bài học sau khi ghi danh.
        </li>
        <li>
          <Star aria-hidden="true" />
          Theo dõi tiến độ và tiêu chí chứng chỉ.
        </li>
      </ul>
    </section>
  );
}
