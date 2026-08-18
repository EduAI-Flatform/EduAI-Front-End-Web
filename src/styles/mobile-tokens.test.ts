import { readFileSync } from "node:fs";
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
});
