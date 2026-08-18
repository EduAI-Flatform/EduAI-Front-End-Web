// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicRoot = path.resolve(process.cwd(), "public");

describe("PWA shell contract", () => {
  it("declares a scoped standalone manifest with install icons", () => {
    const manifest = JSON.parse(readFileSync(path.join(publicRoot, "manifest.json"), "utf8"));

    expect(manifest).toMatchObject({
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#0058be",
    });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/pwa-192.svg", sizes: "192x192" }),
      expect.objectContaining({ src: "/pwa-512.svg", sizes: "512x512" }),
    ]));
  });

  it("never intercepts API requests and has a navigation fallback", () => {
    const serviceWorker = readFileSync(path.join(publicRoot, "sw.js"), "utf8");

    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('request.mode === "navigate"');
    expect(serviceWorker).toContain('caches.match("/")');
  });
});
