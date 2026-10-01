/**
 * whatsnew.js — the one-time "What's new in 3.0" card on Today.
 *
 * v3.0 redraws every screen and adds the Look (Paper or Reel) and a theme
 * choice, with nothing in the app to say where they are. An existing user
 * opens Today after the update and finds a different app. This is local
 * device state, like `wgt:update` and `wgt:backup`, deliberately NOT part of
 * exportAll() — a fresh browser that restores someone else's backup has never
 * seen this device run v2 and should not be told "welcome to what's new"
 * about a history it doesn't have. App.jsx marks a first-run completion seen
 * instead of ever showing the card. The flag is per release (seenV3), so a
 * device that dismissed the 2.0 card sees this one.
 */
import { load, save } from "./storage.js";

const RECORD = "whatsnew";

/** Has this device already dismissed (or been exempted from) the 3.0 card? */
export function whatsNewSeen() {
  return Boolean(load(RECORD, {}).seenV3);
}

/** Mark the 3.0 card as handled — dismissed by the user, or never applicable. */
export function markWhatsNewSeen() {
  save(RECORD, { seenV3: true });
}
