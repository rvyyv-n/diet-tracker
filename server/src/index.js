/**
 * index.js — the Rise reminder Worker.
 *
 * Two entry points. `fetch` is a four-route subscription API the client talks
 * to (pass 53). `scheduled` runs on the quarter hour, works out which devices
 * standing at one of *their* reminder times in their own timezone, and sends
 * each one a bodiless push.
 *
 * The payload is empty by design. The server never learns what block it is
 * pinging about, let alone whether it was eaten — the service worker decides
 * what to show at delivery time by reading local storage, and stays silent for
 * a block already logged. See `reminder_push_no_personal_data` in
 * docs/roadmap.md.
 *
 * BLOCKS is imported from the app itself rather than copied. The device picks
 * which times it wants (only its active blocks), but the server only accepts
 * times that are real block times — plan.js is pure data with no imports and
 * no DOM, so it bundles into a Worker unchanged, and a block time that moves
 * in the plan moves here on the next deploy.
 */

import { BLOCKS } from "../../src/js/core/plan.js";
import {
  claimFiring,
  deleteByKey,
  deleteSubscription,
  isValidEndpoint,
  isValidTimeZone,
  listSubscriptions,
  putSubscription,
  readSubscription,
} from "./subs.js";
import { sendPush } from "./vapid.js";

const BLOCK_TIMES = new Set(BLOCKS.map((b) => b.time));

/** The requested times, deduped and sorted, or null if any is not a block time. */
function cleanTimes(times) {
  if (!Array.isArray(times) || times.length === 0 || times.length > BLOCK_TIMES.size) return null;
  if (!times.every((t) => BLOCK_TIMES.has(t))) return null;
  return [...new Set(times)].sort();
}

const json = (body, status, env) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors(env) },
  });

const cors = (env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
});

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, blocks: BLOCKS.length }, 200, env);
    }

    // The client needs the VAPID public key to call pushManager.subscribe().
    // Serving it from here rather than baking it into the bundle means
    // rotating the key pair is a Worker deploy, not an app release.
    if (request.method === "GET" && url.pathname === "/vapid-public-key") {
      return json({ key: env.VAPID_PUBLIC_KEY }, 200, env);
    }

    if (request.method === "POST" && url.pathname === "/subscribe") {
      const body = await readBody(request);
      if (!body || !isValidEndpoint(body.endpoint)) return json({ error: "bad endpoint" }, 400, env);
      if (!isValidTimeZone(body.tz)) return json({ error: "bad timezone" }, 400, env);
      const times = cleanTimes(body.times);
      if (!times) return json({ error: "bad times" }, 400, env);
      await putSubscription(env, body.endpoint, body.tz, times);
      return json({ ok: true }, 200, env);
    }

    if (request.method === "POST" && url.pathname === "/unsubscribe") {
      const body = await readBody(request);
      if (!body || !isValidEndpoint(body.endpoint)) return json({ error: "bad endpoint" }, 400, env);
      await deleteSubscription(env, body.endpoint);
      return json({ ok: true }, 200, env);
    }

    return json({ error: "not found" }, 404, env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(fire(new Date(event.scheduledTime), env));
  },
};

/**
 * The local wall clock in one timezone, as { date: "YYYY-MM-DD", time: "HH:MM" }.
 *
 * hourCycle h23 matters: the default for some locales renders midnight as
 * "24", which would never match a block time and would silently drop an
 * 00:00 reminder if one were ever added to the plan.
 */
function localParts(instant, tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const at = (type) => parts.find((p) => p.type === type)?.value;
  return { date: `${at("year")}-${at("month")}-${at("day")}`, time: `${at("hour")}:${at("minute")}` };
}

async function fire(instant, env) {
  const subs = await listSubscriptions(env);
  if (subs.length === 0) return;

  // Most ticks match nothing. Resolving the wall clock once per distinct
  // timezone keeps that case to a single list call and a little arithmetic,
  // however many devices share a zone.
  const clockByZone = new Map();
  for (const { tz } of subs) {
    if (!tz || clockByZone.has(tz) || !isValidTimeZone(tz)) continue;
    clockByZone.set(tz, localParts(instant, tz));
  }

  for (const { key, tz, times } of subs) {
    const clock = clockByZone.get(tz);
    if (!clock || !times.includes(clock.time)) continue;

    if (!(await claimFiring(env, key, clock.date, clock.time))) continue;

    const sub = await readSubscription(env, key);
    if (!sub) continue;

    const status = await sendPush(sub.endpoint, env);
    // 404/410 are the push service saying the subscription is gone for good
    // (RFC 8030). Anything else — including a 429 or a 5xx — is transient and
    // the record stays; the next block time retries it.
    if (status === 404 || status === 410) await deleteByKey(env, key);
  }
}
