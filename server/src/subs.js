/**
 * subs.js — the subscription store.
 *
 * One KV entry per device. The record holds an endpoint, an IANA timezone,
 * and the clock times the device wants pinged at — and nothing else: no
 * profile, no meal names, no log, no id that outlives the subscription. That
 * is the whole of `reminder_push_no_personal_data` in docs/roadmap.md — the
 * server knows *when* to ping a browser and never what the ping is about.
 *
 * The times are there because a device only wants pings for the blocks
 * actually on its plan. A switched-off add-on pinged anyway would reach a
 * service worker with nothing to say, and browsers punish a push that shows no
 * notification (Chrome posts its own generic one; Safari revokes the
 * subscription after a few). The list is a bare schedule — "13:30", not
 * "Lunch".
 *
 * The key is a SHA-256 of the endpoint rather than the endpoint itself, so
 * keys stay a fixed length (push endpoints run to hundreds of characters) and
 * re-subscribing the same device overwrites rather than duplicates.
 *
 * The timezone and times are duplicated into KV *metadata*, which `list()`
 * returns inline. A cron tick can therefore decide which devices are due from the one
 * list call and only `get()` the few that are, instead of reading every
 * record ninety-six times a day.
 */

const PREFIX = "sub:";

async function keyFor(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return PREFIX + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A timezone is valid if Intl will accept it; there is no list to check against. */
export function isValidTimeZone(tz) {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidEndpoint(endpoint) {
  if (typeof endpoint !== "string" || endpoint.length > 2000) return false;
  try {
    return new URL(endpoint).protocol === "https:";
  } catch {
    return false;
  }
}

export async function putSubscription(env, endpoint, tz, times) {
  const key = await keyFor(endpoint);
  await env.SUBS.put(key, JSON.stringify({ endpoint, tz, times, updatedAt: new Date().toISOString() }), {
    metadata: { tz, times },
  });
  return key;
}

export async function deleteSubscription(env, endpoint) {
  await env.SUBS.delete(await keyFor(endpoint));
}

export async function deleteByKey(env, key) {
  await env.SUBS.delete(key);
}

/**
 * Every subscription key, with its timezone and times from metadata. KV list pages at
 * 1000 keys; the loop is there for correctness, not because a personal
 * install will ever need a second page.
 */
export async function listSubscriptions(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBS.list({ prefix: PREFIX, cursor });
    for (const entry of page.keys) {
      out.push({ key: entry.name, tz: entry.metadata?.tz, times: entry.metadata?.times ?? [] });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

export async function readSubscription(env, key) {
  const raw = await env.SUBS.get(key);
  return raw ? JSON.parse(raw) : null;
}

/**
 * A short-lived marker that a given device has already been pinged at a
 * given local time on a given local day. Cron Triggers are at-least-once, and a
 * retried tick landing in the same minute would otherwise fire twice. The
 * marker expires in an hour — well past the minute it guards, well short of
 * the same block tomorrow.
 *
 * (KV's minimum expirationTtl is 60s; an hour is comfortably above it.)
 */
export async function claimFiring(env, key, localDate, localTime) {
  const mark = `fired:${key.slice(PREFIX.length)}:${localDate}:${localTime}`;
  if (await env.SUBS.get(mark)) return false;
  await env.SUBS.put(mark, "1", { expirationTtl: 3600 });
  return true;
}
