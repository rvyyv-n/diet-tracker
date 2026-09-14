/**
 * reminders.js — web push meal reminders, the client half (pass 53).
 *
 * The server (server/, pass 52) knows a push endpoint, a timezone and a list
 * of clock times, and nothing else. It sends an empty ping at each time; the
 * service worker (public/sw.js) wakes, reads a copy of today's plan, and
 * decides what the notification says. That split is
 * `reminder_push_no_personal_data` in docs/roadmap.md.
 *
 * The copy has to live in IndexedDB, not localStorage: a service worker can't
 * read localStorage at all. So this module keeps a small snapshot there —
 * today's active blocks with their name, time, kcal, protein and whether
 * they're ticked — and rewrites it after every write to `days` or `profile`
 * (see storage.js onWrite). The worker never imports plan.js; it only reads
 * what this file has already resolved.
 *
 * Device state (which endpoint and times were last sent) lives in its own
 * `wgt:reminders` record. Like `wgt:update`, backup.js leaves it out of an
 * export: a subscription belongs to one browser, not to the data.
 */

import { load, save, remove, onWrite } from "./storage.js";
import { loadProfile } from "./profile.js";
import { getDay, allDays } from "./days.js";
import { newDay, dayAddOns, dayBonus, blockValue } from "./day.js";
import { activeBlocks, blockById } from "./plan.js";
import { todayISO } from "./dates.js";
import { detectBuild } from "./updates.js";

const PUSH_URL = (import.meta.env.VITE_PUSH_URL || "").replace(/\/+$/, "");
const RECORD = "reminders";

// Shared with public/sw.js, which can't import this file — change both.
const IDB_NAME = "rise-reminders";
const IDB_STORE = "kv";

/* ---------------------------------------------------------------- support */

/**
 * Whether reminders can run here:
 *   "ok"           — a browser with push, and a server configured at build time
 *   "unsupported"  — no push in this browser (includes iOS Safari before the
 *                    app is added to the Home Screen)
 *   "native"       — the Windows or Android shell; their reminders are
 *                    passes 54–55, not web push
 *   "unconfigured" — built without VITE_PUSH_URL, so there's no server to use
 */
export function reminderSupport() {
  if (detectBuild() !== "web") return "native";
  if (!PUSH_URL) return "unconfigured";
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof window === "undefined" ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return "ok";
}

/** The clock times the server should ping: one per block on the current plan. */
export function reminderTimes(profile = loadProfile()) {
  return [...new Set(activeBlocks(profile.addOns).map((b) => b.time))].sort();
}

function timeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/* --------------------------------------------------------------- snapshot */

/** Every block on a day, resolved to what a notification needs. */
function resolveBlocks(day) {
  const ids = new Set([...activeBlocks(dayAddOns(day)).map((b) => b.id), ...dayBonus(day)]);
  const out = {};
  for (const id of ids) {
    const block = blockById(id);
    if (!block) continue;
    const { kcal, proteinG } = blockValue(day, id);
    out[id] = { name: block.name, time: block.time, kcal, proteinG, done: Boolean(day.completed?.[id]) };
  }
  return out;
}

/**
 * Today as the worker should see it. `today` is the stored day, if there is
 * one. `fresh` is what a new day would look like — the same seeding Today's
 * screen does (current phase, current add-ons, rotations carried from the
 * last recorded day) — for when the worker wakes on a date the app hasn't
 * been opened on yet.
 */
function buildSnapshot() {
  const profile = loadProfile();
  const date = todayISO();
  const stored = getDay(date);
  const last = allDays().at(-1);
  return {
    date,
    today: stored ? resolveBlocks(stored) : null,
    fresh: resolveBlocks(newDay(date, profile.currentPhaseId, profile.addOns, last?.rotations)),
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(entries) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      for (const [k, v] of Object.entries(entries)) tx.objectStore(IDB_STORE).put(v, k);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/* ----------------------------------------------------------- subscription */

function keyBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * The service worker registration, or a rejection after ten seconds.
 * `navigator.serviceWorker.ready` never settles if registration failed, and a
 * toggle stuck on "working" forever is worse than an error.
 */
function readyRegistration() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error("no service worker")), 10000)),
  ]);
}

async function currentSubscription() {
  if (reminderSupport() !== "ok") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function post(path, body) {
  const res = await fetch(`${PUSH_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`reminder service ${res.status}`);
}

/**
 * Tell the server about this subscription, and remember what was sent. The
 * worker gets the same details in IndexedDB so it can re-register on its own
 * if the browser rotates the subscription (`pushsubscriptionchange`) while
 * the app is closed.
 */
async function register(sub) {
  const sent = { endpoint: sub.endpoint, tz: timeZone(), times: reminderTimes() };
  await post("/subscribe", sent);
  save(RECORD, sent);
  await idbPut({ config: { pushUrl: PUSH_URL, tz: sent.tz, times: sent.times } });
}

/**
 * The toggle's state:
 *   "on" | "off" | "blocked" (notifications denied) | any non-"ok" support value
 */
export async function reminderState() {
  const support = reminderSupport();
  if (support !== "ok") return support;
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

/**
 * Turn reminders on. Must run from a tap — browsers only show the permission
 * prompt in response to one. Resolves to the new state; throws if the
 * service or the push subscription fails.
 */
export async function enableReminders() {
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "off";

  const reg = await readyRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch(`${PUSH_URL}/vapid-public-key`);
    if (!res.ok) throw new Error(`reminder service ${res.status}`);
    const { key } = await res.json();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  }

  await idbPut({ snapshot: buildSnapshot() });
  await register(sub);
  return "on";
}

/**
 * Turn reminders off. The local unsubscribe always happens, even when the
 * server can't be reached: a dead endpoint left on the server gets pruned the
 * first time a push to it comes back 410.
 */
export async function disableReminders() {
  const sub = await currentSubscription();
  if (sub) {
    try {
      await post("/unsubscribe", { endpoint: sub.endpoint });
    } catch {
      /* pruned on the next 410 — see above */
    }
    await sub.unsubscribe();
  }
  remove(RECORD);
  return "off";
}

/* ------------------------------------------------------------------- sync */

let syncQueued = false;

/**
 * Bring the worker's snapshot and the server's copy up to date. Cheap when
 * nothing changed: the server is only called when the endpoint, timezone or
 * times differ from what was last sent — an add-on switched on, a phone that
 * flew somewhere, a reset that wiped `wgt:reminders`.
 */
async function sync() {
  syncQueued = false;
  const sub = await currentSubscription();
  if (!sub || Notification.permission !== "granted") return;

  await idbPut({ snapshot: buildSnapshot() });

  const sent = load(RECORD, null);
  const times = reminderTimes();
  const same =
    sent &&
    sent.endpoint === sub.endpoint &&
    sent.tz === timeZone() &&
    sent.times?.join() === times.join();
  if (!same) await register(sub);
}

function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  // A tap usually writes more than one record (a day, then the profile);
  // one sync after the burst covers them all.
  setTimeout(() => sync().catch(() => {}), 0);
}

/**
 * Start following writes. Fire-and-forget from main.jsx; a no-op wherever web
 * push can't run, so the native shells and an unconfigured build never touch
 * IndexedDB or the network.
 */
export function initReminders() {
  if (reminderSupport() !== "ok") return;
  onWrite((name) => {
    if (name === "days" || name === "profile" || name === "*") queueSync();
  });
  queueSync();
}
