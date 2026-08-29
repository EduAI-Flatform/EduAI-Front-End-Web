const CACHE_VERSION = "v3";
const CACHE_PREFIX = "eduai-pwa-";
const LEGACY_CACHE_NAMES = new Set(["eduai-shell-v1"]);
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const APP_SHELL_URL = "/";
const OFFLINE_URL = "/offline.html";
const STATIC_DESTINATIONS = new Set(["script", "style", "font"]);
const PUBLIC_IMAGE_PREFIXES = ["/assets/", "/demo-assets/"];
const PRECACHE_FILES = [
  APP_SHELL_URL,
  OFFLINE_URL,
  "/manifest-v3.json",
  "/manifest.json",
  "/favicon.svg",
  "/pwa-standard-192-v3.png",
  "/pwa-standard-512-v3.png",
  "/pwa-maskable-192-v3.png",
  "/pwa-maskable-512-v3.png",
  "/apple-touch-icon-180-v3.png",
  /* EDUAI_VITE_PRECACHE */
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await Promise.all(
        PRECACHE_FILES.map(async (file) => {
          try {
            const response = await fetch(file, { cache: "no-cache" });
            if (response.ok) await cache.put(file, response);
          } catch {
            // A partially available install can still recover through navigation.
          }
        }),
      );
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                LEGACY_CACHE_NAMES.has(key) ||
                (key.startsWith(CACHE_PREFIX) && !key.endsWith(CACHE_VERSION)),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || isNetworkOnlyPath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (!isCacheableStaticRequest(request, url)) return;

  event.respondWith(
    isHashedAsset(url.pathname)
      ? cacheFirstStatic(request)
      : staleWhileRevalidate(request),
  );
});

function isNetworkOnlyPath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/__/auth/") ||
    /^\/auth(?:\/|$)/i.test(pathname) ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/check-email" ||
    pathname.includes("oauth") ||
    pathname.includes("callback") ||
    /\/(?:cart|membership|library|ai|certificates|learning|quizzes|assignments|classroom-sessions|dashboard|profile|instructor|admin)(?:\/|$)/i.test(pathname) ||
    /\/(?:payment|payments|payos|commerce|checkout|orders)(?:\/|$)/i.test(pathname)
  );
}

function isCacheableStaticRequest(request, url) {
  if (STATIC_DESTINATIONS.has(request.destination)) return true;
  if (request.destination !== "image") return false;
  return PUBLIC_IMAGE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    [
      "/favicon.svg",
      "/pwa-standard-192-v3.png",
      "/pwa-standard-512-v3.png",
      "/pwa-maskable-192-v3.png",
      "/pwa-maskable-512-v3.png",
      "/apple-touch-icon-180-v3.png",
    ].includes(url.pathname);
}

function isHashedAsset(pathname) {
  return pathname.startsWith("/assets/") && /[-.][A-Za-z0-9_-]{8,}\./.test(pathname);
}

async function networkFirstNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (url.pathname === "/" && response.ok && isHtmlResponse(response)) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(OFFLINE_URL)) || (await caches.match(APP_SHELL_URL));
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cacheResponse(STATIC_CACHE, request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok) await cacheResponse(RUNTIME_CACHE, request, response.clone());
    return response;
  });

  if (cached) {
    void network.catch(() => undefined);
    return cached;
  }

  return network;
}

async function cacheResponse(cacheName, request, response) {
  if (!response.ok) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

function isHtmlResponse(response) {
  return response.headers.get("content-type")?.includes("text/html") === true;
}
