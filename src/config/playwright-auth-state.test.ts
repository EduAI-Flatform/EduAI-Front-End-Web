// @vitest-environment node

import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAuthStatePath } from "../../playwright/auth-state";

describe("getAuthStatePath", () => {
  it("keeps local and production credentials in separate ignored files", () => {
    expect(path.basename(getAuthStatePath("student", "local"))).toBe(
      "student.json",
    );
    expect(path.basename(getAuthStatePath("student", "production"))).toBe(
      "student.production.json",
    );
  });
});
