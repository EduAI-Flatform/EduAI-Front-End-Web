import path from "node:path";

export type AuthRole = "student" | "instructor" | "administrator";
export type AuthStateScope = "local" | "production";

export function getAuthStatePath(
  role: AuthRole,
  scope: AuthStateScope = "local",
): string {
  const fileName =
    scope === "production" ? `${role}.production.json` : `${role}.json`;

  return path.join(process.cwd(), "playwright", ".auth", fileName);
}
