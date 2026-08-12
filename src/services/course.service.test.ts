import { describe, expect, it } from "vitest";
import { toCourseFormData } from "./course.service";

describe("toCourseFormData", () => {
  it("appends the selected thumbnail file using the backend field name", () => {
    const thumbnail = new File(["image"], "course.png", { type: "image/png" });
    const formData = toCourseFormData({
      level: "beginner",
      thumbnail,
      title: "AI Foundations",
    });

    expect(formData.get("thumbnail")).toBe(thumbnail);
    expect(formData.get("thumbnailUrl")).toBeNull();
  });
});
