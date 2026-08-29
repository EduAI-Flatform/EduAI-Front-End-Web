// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = path.resolve(process.cwd());
const publicRoot = path.join(frontendRoot, "public");

function readPngDimensions(fileName: string) {
  const png = readFileSync(path.join(publicRoot, fileName));

  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

describe("PWA production contract", () => {
  it("declares a scoped standalone Vietnamese education manifest", () => {
    const manifest = JSON.parse(readFileSync(path.join(publicRoot, "manifest.json"), "utf8"));
    const versionedManifest = JSON.parse(
      readFileSync(path.join(publicRoot, "manifest-v3.json"), "utf8"),
    );

    expect(versionedManifest).toEqual(manifest);

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
    expect(manifest.icons).toEqual([
      { src: "/pwa-standard-192-v3.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-standard-512-v3.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-maskable-192-v3.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-maskable-512-v3.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
    expect(new Set(manifest.icons.map((icon: { src: string }) => icon.src)).size).toBe(4);
    expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual(["/", "/courses"]);
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          icons: [{ src: "/pwa-standard-192-v3.png", sizes: "192x192", type: "image/png" }],
        }),
      ]),
    );
  });

  it("ships correctly sized purpose-specific PNG assets from full-bleed vector sources", () => {
    expect(readPngDimensions("pwa-standard-192-v3.png")).toEqual({ width: 192, height: 192 });
    expect(readPngDimensions("pwa-standard-512-v3.png")).toEqual({ width: 512, height: 512 });
    expect(readPngDimensions("pwa-maskable-192-v3.png")).toEqual({ width: 192, height: 192 });
    expect(readPngDimensions("pwa-maskable-512-v3.png")).toEqual({ width: 512, height: 512 });
    expect(readPngDimensions("apple-touch-icon-180-v3.png")).toEqual({ width: 180, height: 180 });

    for (const source of ["pwa-standard-v3.svg", "pwa-maskable-v3.svg", "apple-touch-icon-v3.svg"]) {
      const svg = readFileSync(path.join(publicRoot, source), "utf8");
      expect(svg).toContain('<rect width="512" height="512" fill="#0058be"');
      expect(svg).not.toMatch(/<rect[^>]+rx=/);
    }
  });

  it("links the manifest and Apple metadata from the document shell", () => {
    const index = readFileSync(path.join(frontendRoot, "index.html"), "utf8");

    expect(index).toContain('<link rel="manifest" href="/manifest-v3.json" />');
    expect(index).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(index).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon-180-v3.png" sizes="180x180" />');
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
    expect(serviceWorker).toContain('pathname.startsWith("/__/auth/")');
    expect(serviceWorker).toContain('pathname === "/login"');
    expect(serviceWorker).toContain('pathname === "/register"');
    expect(serviceWorker).toContain('pathname.includes("callback")');
    expect(serviceWorker).toContain("dashboard");
    expect(serviceWorker).toContain("payos");
    expect(serviceWorker).toContain("commerce");
    expect(serviceWorker).toContain("SKIP_WAITING");
    expect(serviceWorker).toContain('"eduai-shell-v1"');
    const installBlock = serviceWorker.slice(serviceWorker.indexOf('self.addEventListener("install"'), serviceWorker.indexOf('self.addEventListener("activate"'));
    expect(installBlock).not.toContain("skipWaiting");
  });
});
