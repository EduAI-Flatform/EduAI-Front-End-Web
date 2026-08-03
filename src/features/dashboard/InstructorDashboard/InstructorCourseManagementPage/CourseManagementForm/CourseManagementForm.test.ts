import { describe, expect, it } from "vitest";
import type { CourseMutationInput } from "../../../../../services/course.service";
import { validateCourseInput } from "./CourseManagementForm";

const validInput: CourseMutationInput = {
  title: "AI Foundations",
  level: "beginner",
  visibility: "public",
};

describe("validateCourseInput", () => {
  it("uses the backend badge limit of 50 characters", () => {
    expect(
      validateCourseInput({
        ...validInput,
        badge: "a".repeat(50),
      }).badge,
    ).toBeUndefined();
    expect(
      validateCourseInput({
        ...validInput,
        badge: "a".repeat(51),
      }).badge,
    ).toContain("50");
  });
});
