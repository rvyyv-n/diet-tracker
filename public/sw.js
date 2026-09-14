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

const CACHE_NAME = "rise-v38";

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

/* ------------------------------------------------------------ reminders */

/*
 * Meal reminders (pass 53). The reminder server sends an empty push at each
 * of this device's block times and knows nothing else (see server/README.md).
 * What to say is decided here, from a snapshot of today's plan that
 * src/js/core/reminders.js keeps in IndexedDB — a worker can't read
 * localStorage, and this file isn't bundled, so it can't import plan.js.
 *
 * Every push shows *something*. A push that shows nothing is punished: Chrome
 * posts its own "site updated in the background" notice, and Safari revokes
 * the subscription after a few. So a block that's already logged still gets a
 * notification — a soundless "Lunch — logged" — rather than silence.
 */

// Shared with src/js/core/reminders.js — change both.
const REMINDER_DB = "rise-reminders";
const REMINDER_STORE = "kv";

function reminderRead(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open(REMINDER_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(REMINDER_STORE);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      const get = db.transaction(REMINDER_STORE, "readonly").objectStore(REMINDER_STORE).get(key);
      get.onsuccess = () => {
        resolve(get.result ?? null);
        db.close();
      };
      get.onerror = () => {
        resolve(null);
        db.close();
      };
    };
  });
}

function localDateISO(now) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The block this push is for: the one whose time is nearest now, within an
 * hour either side. A push is sent on the minute but can land late — the
 * server gives it 30 minutes to live — and a clock a few minutes fast would
 * land it early.
 */
function dueBlock(blocks, now) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  let best = null;
  let bestGap = 61;
  for (const block of Object.values(blocks)) {
    const [h, m] = block.time.split(":").map(Number);
    const gap = Math.abs(minutes - (h * 60 + m));
    if (gap < bestGap) {
      best = block;
      bestGap = gap;
    }
  }
  return best;
}

async function showReminder() {
  const now = new Date();
  const snap = await reminderRead("snapshot");
  const blocks = snap ? (snap.date === localDateISO(now) && snap.today ? snap.today : snap.fresh) : null;
  const block = blocks ? dueBlock(blocks, now) : null;
  const base = { icon: "assets/icon-192.png", data: { url: "./" } };

  // No snapshot (storage cleared) or no block near this time (the plan changed
  // after the server was last told): still show something, quietly.
  if (!block) {
    return self.registration.showNotification("Rise", { ...base, body: "Meal time", tag: "rise-reminder", silent: true });
  }

  const tag = `rise-reminder-${block.time}`;
  if (block.done) {
    return self.registration.showNotification(`${block.name} — logged`, { ...base, tag, silent: true });
  }
  return self.registration.showNotification(`${block.name} · ${block.time}`, {
    ...base,
    tag,
    body: `${block.kcal} kcal · ${block.proteinG} g protein`,
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(showReminder());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => "focus" in c);
      if (open) return open.focus();
      return self.clients.openWindow(event.notification.data?.url || "./");
    }),
  );
});

/**
 * The browser rotated the push subscription (it can, at any time, with the
 * app closed). Re-subscribe with the same key and tell the server, using the
 * details the app last registered with. The app's own sync also catches a
 * changed endpoint the next time it opens; this just closes the gap before
 * then.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const config = await reminderRead("config");
      const key = event.oldSubscription?.options?.applicationServerKey;
      if (!config || !key) return;
      const sub = event.newSubscription ?? (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      await fetch(`${config.pushUrl}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, tz: config.tz, times: config.times }),
      });
      if (event.oldSubscription) {
        await fetch(`${config.pushUrl}/unsubscribe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: event.oldSubscription.endpoint }),
        }).catch(() => {});
      }
    })().catch(() => {}),
  );
});
