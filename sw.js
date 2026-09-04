/**
 * sw.js — a cache-first service worker so Rise runs fully offline.
 *
 * On install every file the app needs is fetched once and stored. After that,
 * requests are served from the cache first and only fall through to the network
 * when something is missing; a fresh network response is folded back in. A
 * failed navigation falls back to the app shell.
 *
 * PRECACHE_URLS is a hand-maintained list — when a source file is ADDED to the
 * project (not just edited), add it here and bump CACHE_NAME so clients refetch.
 */

const CACHE_NAME = "rise-v19";

const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.json",
  "assets/icon.svg",

  "src/css/tokens.css",
  "src/css/app.css",

  "assets/fonts/inter-400.woff2",
  "assets/fonts/inter-500.woff2",
  "assets/fonts/newsreader-400.woff2",

  "src/js/app.js",
  "src/js/today.js",
  "src/js/plan-view.js",
  "src/js/weight.js",
  "src/js/welcome.js",
  "src/js/settings.js",
  "src/js/intro.js",

  "src/js/core/adjust.js",
  "src/js/core/appinfo.js",
  "src/js/core/backup.js",
  "src/js/core/broadcast.js",
  "src/js/core/dates.js",
  "src/js/core/day.js",
  "src/js/core/days.js",
  "src/js/core/extras.js",
  "src/js/core/grocery.js",
  "src/js/core/persist.js",
  "src/js/core/plan.js",
  "src/js/core/profile.js",
  "src/js/core/recipes.js",
  "src/js/core/storage.js",
  "src/js/core/theme.js",
  "src/js/core/trend.js",
  "src/js/core/units.js",
  "src/js/core/updates.js",
  "src/js/core/version.js",
  "src/js/core/weights.js",

  "src/js/ui/date-calendar.js",
  "src/js/ui/date-dropdowns.js",
  "src/js/ui/dom.js",
  "src/js/ui/icons.js",
  "src/js/ui/listbox.js",
  "src/js/ui/popover.js",
  "src/js/ui/weight-input.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") return caches.match("index.html");
          return Response.error();
        });
    }),
  );
});
