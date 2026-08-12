import { describe, expect, it } from "vitest";
import { toPortfolioFormData } from "./profile.service";

describe("toPortfolioFormData", () => {
  it("appends a selected project image without requiring an image URL", () => {
    const image = new File(["image"], "project.webp", { type: "image/webp" });
    const formData = toPortfolioFormData({ image, title: "AI Assistant" });

    expect(formData.get("title")).toBe("AI Assistant");
    expect(formData.get("image")).toBe(image);
    expect(formData.get("imageUrl")).toBeNull();
  });
});
