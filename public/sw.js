/**
 * sw.js — a cache-first service worker so Rise runs fully offline.
 *
 * On install the static shell is fetched once and stored. After that, every
 * request is served from the cache first and only falls through to the
 * network when something is missing; a fresh network response is folded back
 * in as it's seen, which is what gets the JS/CSS bundle cached too (see
 * below). A failed navigation falls back to the app shell.
 *
 * PRECACHE_URLS used to hand-list every source file, back when the app shipped
 * as plain unbundled ES modules with stable filenames. Pass 45's Vite build
 * outputs a hashed, bundled index-*.js/css instead — a new hash on every
 * build, so a hand-maintained list can't name them and doesn't need to: the
 * fetch handler below already caches whatever it's asked for, and the very
 * first navigation asks for exactly that bundle (plus, later, whichever
 * screen chunk a route actually loads). What's still precached here is the
 * small set of files nothing ever "requests" as a page navigation would —
 * the shell's static, unhashed public/ assets. Bump CACHE_NAME whenever one of
 * *these* is added or changed so clients refetch; the bundle doesn't need
 * that treatment since a new build gets new hashes automatically.
 */

const CACHE_NAME = "rise-v34";

const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.json",
  "assets/icon.svg",
  "assets/icon-dark.svg",
  "assets/icon-mono.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/apple-touch-icon.png",

  "assets/fonts/inter-400.woff2",
  "assets/fonts/inter-500.woff2",
  "assets/fonts/newsreader-400.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // addAll() alone can be satisfied from the browser's HTTP cache, which
        // defeats bumping CACHE_NAME right after editing a file that was just
        // fetched. cache: "reload" forces each precache fetch past that layer.
        Promise.all(PRECACHE_URLS.map((url) => fetch(url, { cache: "reload" }).then((res) => cache.put(url, res)))),
      )
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

  // Untracked dev scratch files (dev-seed.html and friends) go straight to the
  // network, never the cache. Everything below is cache-first, which is right
  // for the app — it is what makes it work offline — but it means an edited
  // file keeps serving its old copy until CACHE_NAME is bumped. For the app
  // that is a deliberate, documented step; for a dev tool you are actively
  // editing it is a trap, and it cost a debugging session once: a syntax error
  // in dev-seed.html was fixed and the page kept running the broken cached
  // copy, which looked exactly like the fix not working.
  if (url.pathname.split("/").pop().startsWith("dev-")) return;

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
