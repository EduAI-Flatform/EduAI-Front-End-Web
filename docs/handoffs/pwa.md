# EduAI PWA handoff

## Architecture

EduAI uses the existing React/Vite application with a small hand-written Service Worker. `vite-plugin-pwa` and Workbox were evaluated but not added: the repository did not already depend on them, and the required policy is narrow enough to keep in one auditable worker. `vite.config.ts` injects the generated JavaScript, CSS, and font bundle names into the worker precache list after each production build.

PWA state is centralized under `src/features/pwa/`:

- `PwaProvider` owns platform detection, standalone state, install prompt capture, online state, and update state.
- `PwaInstallButton`, `PwaInstallPrompt`, and `PwaInstallGuide` provide the discoverable header/action and platform-specific guidance.
- `pwa-runtime.ts` owns Service Worker registration, update detection, activation, and the single reload after `controllerchange`.
- `pwa-utils.ts` contains standalone, browser, and dismissal-storage helpers.

The provider is mounted in `src/main.tsx`; the existing authentication and commerce modules are not changed.

## Manifest and assets

`public/manifest.json` is the canonical manifest and `public/manifest-v3.json` is its cache-busted deployment copy. They use a stable `id` and root `scope`/`start_url`, standalone display, Vietnamese metadata, education category, and distinct PNG `any` and `maskable` icons at 192x192 and 512x512. The standard, maskable, and Apple masters are separate full-bleed SVGs; generate their exact-size PNGs with `npm run assets:pwa`. Stable shortcuts point to `/` and `/courses` and use the standard icon. `index.html` links the v3 manifest and the dedicated 180x180 Apple touch icon.

The host must serve `/manifest.json`, `/sw.js`, and the PNG icons from the same HTTPS origin. The Service Worker must remain at the origin root so it controls the full application scope.

## Service Worker and cache strategy

Cache names are versioned with the `eduai-pwa-` prefix:

- `shell-v3`: root app shell, offline fallback, versioned manifests/icons, and generated precache assets.
- `static-v3`: successful public static resources fetched at runtime.
- `runtime-v3`: reserved for safe future public runtime resources.

Policy:

| Request | Strategy | Notes |
| --- | --- | --- |
| Build JS/CSS/fonts with content hashes | Cache First | Same-origin only; successful responses only. |
| Public images under `/assets/` or `/demo-assets/` | Stale While Revalidate | Public paths only. |
| Root document navigation | Network First | On failure, branded `/offline.html` is preferred; cached root shell is a last resort. |
| `/api/*`, `/__/auth/*`, login/register/callback, private/admin, commerce, checkout, orders, payment, PayOS | Network Only | The worker does not intercept these requests or provide an offline shell fallback. |
| POST/PUT/PATCH/DELETE | Network Only | The worker handles only GET requests. |

The worker never caches tokens, Firebase/auth exchange responses, refresh/session responses, personalized API data, mutations, or payment/order state. The offline page is intentionally static and does not claim that a transaction or login succeeded.

## Install UX

The header contains a reusable `Cài đặt EduAI` entry whenever the browser can install the app or supports a platform-specific manual guide. A small engagement card appears after 1.5 seconds, not immediately on first paint. `Để sau` is persisted in local storage and native browser dismissal is persisted as well, preventing an immediate repeat prompt.

- Desktop Chromium and Android Chromium use `beforeinstallprompt` when exposed.
- If the event is unavailable, Android and desktop show manual browser-menu guidance.
- iOS/iPadOS Safari shows explicit Share -> Add to Home Screen steps and never presents a false automated install button.
- Installed/standalone mode hides install UI.

## Standalone and offline behavior

Standalone is detected with `matchMedia('(display-mode: standalone)')` and iOS `navigator.standalone`. Online/offline transitions are reflected by a retryable branded notice. Navigation failures resolve to `offline.html` before the cached root shell, which avoids presenting stale transactional state as authoritative.

## Update behavior

A newly installed worker waits for the user. When a waiting worker controls an existing client, the provider displays `Đã có phiên bản EduAI mới.`. User action posts `SKIP_WAITING`; the worker activates and the client reloads once on `controllerchange`. Registration/update failures are swallowed safely, and the UI does not force a refresh. This conservative flow avoids disrupting authentication, payment, checkout, unsaved forms, or course editing.

When the cache contract changes, increment `CACHE_VERSION` in `public/sw.js`. Hashed assets and the new worker script ensure new builds do not remain permanently pinned to old bundles.

The v3 activation step also deletes the pre-prefix `eduai-shell-v1` cache. Keep explicitly named legacy caches in `LEGACY_CACHE_NAMES` until production clients have had enough time to activate the cleanup worker.

## Validation

Run from `EduAI-Front-End-Web`:

```text
npm test
npm run build
PLAYWRIGHT_SKIP_BACKEND=1 PLAYWRIGHT_PREVIEW=1 npx playwright test playwright/pwa-install.spec.ts --project=chromium --project=webkit-pwa --no-deps
npm audit --omit=dev --audit-level=high
```

For a production-bundle check, run `npm run preview` after the build and inspect the browser Application panel: manifest parsing, icon responses, installability errors, Service Worker scope/control, cache contents, and offline navigation. Also verify that `/api/v1`, `/__/auth/*`, `/login`, callback, private routes such as `/dashboard`, PayOS/payment, commerce, and order requests remain network-only.

The CI workflow runs the unit/build/audit quality gate plus Chromium and WebKit PWA responsive/install smoke checks. WebKit is supplemental engine coverage, not a claim of physical Safari verification. The existing approved deployment workflow remains the release path; this change does not deploy or alter VPS/Nginx configuration.

## Known limitations

- Physical iPhone/iPad and Android hardware validation requires access to those devices and was not performed by this change.
- OS-level installation acceptance was not automated; local Chromium verifies the install event/UI and installability diagnostics, not a real desktop/phone home-screen launch.
- Playwright WebKit validates the cached offline page and fail-closed sensitive routes, but its offline emulation does not dispatch a public navigation through the Service Worker. The live navigation fallback is automated in Chromium and remains a physical Safari release-gate check.
- Windows, Android, iOS, macOS, and browser launchers may retain an installed icon after the web cache updates. After deploying v3, uninstall the existing PWA/home-screen shortcut, clear site data if the old icon remains, restart the launcher/browser when necessary, and reinstall before judging the new artwork. Filename versioning prevents HTTP cache collisions but cannot forcibly invalidate every OS launcher cache.
- Production-domain verification must be repeated after the approved deployment. Local production preview verification is not a claim about the live site.
- iOS Safari has no standard web API for a programmatic install prompt, so its flow remains user-guided.
