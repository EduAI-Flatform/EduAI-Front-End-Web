import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CourseDetailView } from "../course-detail.types";
import { CourseEnrollCard } from "./CourseEnrollCard";

const course: CourseDetailView = {
  id: "course-1",
  title: "AI Foundations",
  slug: "ai-foundations",
  description: "Course description",
  thumbnailUrl: null,
  level: "beginner",
  status: "published",
  visibility: "public",
  badge: null,
  featuredRank: null,
  price: { amountMinor: 1499000, currency: "VND" },
  instructor: {
    id: "instructor-1",
    fullName: "Instructor",
    avatarUrl: null,
    headline: "Educator",
    bio: null,
  },
  metrics: {
    lessonCount: 4,
    durationMinutes: 120,
    enrollmentCount: 10,
    ratingAverage: 4.5,
    ratingCount: 4,
  },
  lessonCount: 4,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("CourseEnrollCard voucher entry", () => {
  it("submits a code without calculating a client-side final price", () => {
    const onVoucherPreview = vi.fn();
    render(
      <CourseEnrollCard
        course={course}
        enrollmentError={null}
        isAuthenticated
        isEnrolled={false}
        isEnrollmentLoading={false}
        isSubmitting={false}
        isVoucherLoading={false}
        onEnroll={vi.fn()}
        onPreview={vi.fn()}
        onVoucherPreview={onVoucherPreview}
        voucherError={null}
        voucherPreview={null}
        scholarships={[]}
        appliedScholarshipIds={[]}
        isScholarshipLoading={false}
        scholarshipError={null}
        onScholarshipApply={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Mã voucher"), {
      target: { value: "EDUAI20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onVoucherPreview).toHaveBeenCalledWith("EDUAI20");
    expect(screen.queryByText(/1299000/)).not.toBeInTheDocument();
  });

  it("renders the server preview final amount and rejection state", () => {
    const { rerender } = render(
      <CourseEnrollCard
        course={course}
        enrollmentError={null}
        isAuthenticated
        isEnrolled={false}
        isEnrollmentLoading={false}
        isSubmitting={false}
        isVoucherLoading={false}
        onEnroll={vi.fn()}
        onPreview={vi.fn()}
        onVoucherPreview={vi.fn()}
        voucherError={null}
        voucherPreview={{
          voucherId: "voucher-1",
          code: "EDUAI20",
          currency: "VND",
          eligible: true,
          reason: "eligible",
          discountAmountMinor: 200000,
          finalAmountMinor: 1299000,
        }}
        scholarships={[]}
        appliedScholarshipIds={[]}
        isScholarshipLoading={false}
        scholarshipError={null}
        onScholarshipApply={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Giá sau voucher");
    rerender(
      <CourseEnrollCard
        course={course}
        enrollmentError={null}
        isAuthenticated
        isEnrolled={false}
        isEnrollmentLoading={false}
        isSubmitting={false}
        isVoucherLoading={false}
        onEnroll={vi.fn()}
        onPreview={vi.fn()}
        onVoucherPreview={vi.fn()}
        voucherError="Voucher đã hết lượt sử dụng."
        voucherPreview={null}
        scholarships={[]}
        appliedScholarshipIds={[]}
        isScholarshipLoading={false}
        scholarshipError={null}
        onScholarshipApply={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Voucher đã hết lượt sử dụng.");
  });
});
