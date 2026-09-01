/**
 * persist.js — ask the browser to keep our storage.
 *
 * localStorage already survives a reboot, but under storage pressure a browser
 * can evict it without warning, and iOS clears a home-screen PWA's storage after
 * roughly a week of no use. navigator.storage.persist() marks the origin's data
 * durable so eviction skips it. On Chrome, Android and any installed PWA the
 * grant is silent, decided by engagement heuristics; Firefox prompts once.
 *
 * Best-effort and idempotent: if the grant is already in place we don't ask
 * again, and every failure is swallowed. The app works either way and the in-app
 * Export is the real backstop.
 */

/** Request durable storage for this origin. Resolves to whether it's granted. */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
