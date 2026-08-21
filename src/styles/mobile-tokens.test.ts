import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EduAI mobile design tokens", () => {
  it("defines the semantic type, spacing, icon, and touch-target scale", () => {
    const globalStyles = readFileSync(
      resolve(process.cwd(), "src/styles/global.css"),
      "utf8",
    );

    expect(globalStyles).toMatch(/--space-3:\s*0\.75rem/);
    expect(globalStyles).toMatch(/--text-body:\s*1rem/);
    expect(globalStyles).toMatch(/--text-label:\s*0\.75rem/);
    expect(globalStyles).toMatch(/--icon-md:\s*1\.25rem/);
    expect(globalStyles).toMatch(/--touch-target-min:\s*2\.75rem/);
    expect(globalStyles).toMatch(/--mobile-nav-height:\s*4rem/);
  });

  it("keeps interface typography within the restrained production scale", () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const cssFiles = readdirSync(sourceRoot, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
      .map((entry) => readFileSync(resolve(entry.parentPath, entry.name), "utf8"))
      .join("\n");

    expect(cssFiles).not.toMatch(/font-weight:\s*(?:750|8\d\d|9\d\d)/);
  });

  it("promotes enrollment before long course content on mobile", () => {
    const courseDetailStyles = readFileSync(
      resolve(process.cwd(), "src/features/courses/CourseDetailPage.css"),
      "utf8",
    );

    expect(courseDetailStyles).toMatch(
      /@media\s*\(max-width:\s*767px\)[\s\S]*\.course-detail-sidebar\s*\{[^}]*display:\s*contents/s,
    );
    expect(courseDetailStyles).toMatch(
      /\.course-detail-sidebar\s*>\s*\.course-detail-enroll\s*\{[^}]*order:\s*-1/s,
    );
  });
});
