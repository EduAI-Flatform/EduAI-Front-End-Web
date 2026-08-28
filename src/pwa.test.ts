// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = path.resolve(process.cwd());
const publicRoot = path.join(frontendRoot, "public");

describe("PWA production contract", () => {
  it("declares a scoped standalone Vietnamese education manifest", () => {
    const manifest = JSON.parse(readFileSync(path.join(publicRoot, "manifest.json"), "utf8"));

    expect(manifest).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      theme_color: "#0058be",
      background_color: "#f7f9fc",
      categories: ["education"],
    });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/pwa-192.png", sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ src: "/pwa-192.png", sizes: "192x192", purpose: "maskable" }),
      expect.objectContaining({ src: "/pwa-512.png", sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ src: "/pwa-512.png", sizes: "512x512", purpose: "maskable" }),
    ]));
    expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual(["/", "/courses"]);
  });

  it("links the manifest and Apple metadata from the document shell", () => {
    const index = readFileSync(path.join(frontendRoot, "index.html"), "utf8");

    expect(index).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(index).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(index).toContain('<link rel="apple-touch-icon" href="/pwa-192.png" sizes="192x192" />');
  });

  it("uses a network-first navigation fallback and a branded offline page", () => {
    const serviceWorker = readFileSync(path.join(publicRoot, "sw.js"), "utf8");
    const offlinePage = readFileSync(path.join(publicRoot, "offline.html"), "utf8");

    expect(serviceWorker).toContain('request.mode === "navigate"');
    expect(serviceWorker).toContain("caches.match(APP_SHELL_URL)");
    expect(serviceWorker).toContain("caches.match(OFFLINE_URL)");
    expect(offlinePage).toContain("Bạn đang ngoại tuyến");
    expect(offlinePage).toContain("Không thể kết nối tới EduAI");
    expect(offlinePage).toContain("Thử lại");
  });

  it("keeps auth, private, commerce, payment, and mutations out of caches", () => {
    const serviceWorker = readFileSync(path.join(publicRoot, "sw.js"), "utf8");

    expect(serviceWorker).toContain('request.method !== "GET"');
    expect(serviceWorker).toContain('pathname.startsWith("/api/")');
    expect(serviceWorker).toContain("/auth/firebase");
    expect(serviceWorker).toContain("payos");
    expect(serviceWorker).toContain("commerce");
    expect(serviceWorker).toContain("SKIP_WAITING");
    const installBlock = serviceWorker.slice(serviceWorker.indexOf('self.addEventListener("install"'), serviceWorker.indexOf('self.addEventListener("activate"'));
    expect(installBlock).not.toContain("skipWaiting");
  });
});
