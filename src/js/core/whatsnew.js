/**
 * whatsnew.js — the one-time "What's new in 2.0" card on Today.
 *
 * v2 added off-plan food and recipes, the grocery checklist, configurable
 * overview metrics and a fourth tab with no introduction anywhere in the app —
 * an existing user opens Today after an update and just finds them. This is
 * local device state, like `wgt:update` and `wgt:backup`, deliberately NOT part
 * of exportAll() — a fresh browser that restores someone else's backup has
 * never seen this device run v1.x and should not be told "welcome to what's
 * new" about a history it doesn't have. See app.js for how a first-run
 * completion marks itself seen instead of ever showing the card.
 */
import { load, save } from "./storage.js";

const RECORD = "whatsnew";

/** Has this device already dismissed (or been exempted from) the v2 card? */
export function whatsNewSeen() {
  return Boolean(load(RECORD, {}).seenV2);
}

/** Mark the v2 card as handled — dismissed by the user, or never applicable. */
export function markWhatsNewSeen() {
  save(RECORD, { seenV2: true });
}
