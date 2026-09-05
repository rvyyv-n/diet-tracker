/**
 * backup.js — the whole of the app's state as one JSON object, for export and
 * import on the Settings screen.
 *
 * Everything the app knows lives in five localStorage records: `wgt:profile`,
 * `wgt:days`, `wgt:weights`, `wgt:recipes` (the pass-26 recipe book) and
 * `wgt:grocery` (the pass-30 grocery ticks). This module reads all five into one
 * envelope and writes them back from one. It does not own any UI — settings.js
 * drives it — and it never clears storage; a replace overwrites the five keys in
 * place. `wgt:grocery` is carried for a clean round trip but is NOT surfaced in
 * countRecords() / the import preview: a week of ticks that self-clears on
 * Monday isn't a "record" the user counts.
 *
 * `wgt:update` (the update check's state) is deliberately NOT bundled: it is
 * device state, not user data, and carrying it between browsers would be
 * meaningless. This omission is intentional, not an oversight. The same goes
 * for `wgt:backup` (the last-exported timestamp) and `wgt:snapshot` (the
 * pre-change undo slot) added in pass 17 — both are strictly local.
 */

import { load, save, remove, SCHEMA_VERSION, migrateRecord } from "./storage.js";

/** One object holding every record, stamped so an import can check its age. */
export function exportAll() {
  return {
    app: "diet-tracker",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: load("profile", {}),
    days: load("days", { days: {} }),
    weights: load("weights", { weights: {} }),
    recipes: load("recipes", { recipes: [] }),
    grocery: load("grocery", { weekStart: null, checked: {} }),
  };
}

/**
 * Throw a user-facing message if `obj` is not a backup this build can take —
 * not an object, or from a newer schema than we understand (never migrate data
 * forward blindly). Split out so a caller can check before snapshotting the
 * state it is about to overwrite.
 */
export function assertImportable(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("That file is not a backup.");
  }
  if ((obj.schemaVersion ?? 1) > SCHEMA_VERSION) {
    throw new Error("This backup is from a newer version.");
  }
}

/**
 * Overwrite the stored records from a parsed export object. Each record is run
 * through storage.js's migration ladder first (migrateRecord), not written
 * straight through — a backup made on an older build carries records at that
 * build's schema version, and save() stamps the CURRENT version onto whatever
 * it's given, so skipping this step would mark them migrated when they never
 * were (see migrateRecord's doc comment in storage.js).
 */
export function importAll(obj) {
  assertImportable(obj);
  save("profile", migrateRecord(obj.profile, "profile", {}));
  save("days", migrateRecord(obj.days, "days", { days: {} }));
  save("weights", migrateRecord(obj.weights, "weights", { weights: {} }));
  save("recipes", migrateRecord(obj.recipes, "recipes", { recipes: [] }));
  save("grocery", migrateRecord(obj.grocery, "grocery", { weekStart: null, checked: {} }));
}

/** Counts for the import preview: profiles, day records, weigh-ins, recipes. */
export function countRecords(obj) {
  const hasProfile =
    obj?.profile && obj.profile.heightCm != null && obj.profile.startWeightKg != null;
  return {
    profiles: hasProfile ? 1 : 0,
    days: Object.keys(obj?.days?.days ?? {}).length,
    weights: Object.keys(obj?.weights?.weights ?? {}).length,
    recipes: (Array.isArray(obj?.recipes?.recipes) ? obj.recipes.recipes : []).length,
  };
}

/**
 * Parse a string as an export envelope and return it, or throw a user-facing
 * message. Shared by the file picker and the paste-in route so both reject the
 * same things the same way.
 */
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(String(text));
  } catch {
    throw new Error("That is not valid JSON.");
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("That does not look like a backup.");
  }
  return obj;
}

// --- backup freshness -------------------------------------------------------
// When the data was last written out. Its own record, never in exportAll() —
// an imported backup must not claim it was just exported on the machine that
// received it. Pass 40 removed a stray freshness paragraph that broke the
// Export/Import rows' spacing; the fact itself was never the problem, so it is
// back as that row's own subtitle (see settings.js exportItem()) rather than a
// line of its own. No staleness flag and no "worth doing again" nudge this
// time — that reads as the guilt mechanic the never-nag principle rules out;
// this just states when the last export happened.

/** Record that a fresh export just happened. */
export function noteExport() {
  save("backup", { lastExportedAt: new Date().toISOString() });
}

/** The last export's timestamp, or null if this browser has never exported. */
export function lastExportedAt() {
  return load("backup", {}).lastExportedAt ?? null;
}

// --- the undo slot -------------------------------------------------------
// Import and reset are the only destructive actions, and both are one tap past
// a confirm. Before either runs, the current state is snapshotted into ONE
// slot (not a history — it briefly doubles the storage footprint). Restoring
// consumes it. storage.clear() deliberately preserves this key so a reset can
// still be undone; see storage.js.

/** Snapshot the whole of storage into the undo slot, tagged with why. */
export function takeSnapshot(reason) {
  save("snapshot", { envelope: exportAll(), takenAt: new Date().toISOString(), reason });
}

/** `{ takenAt, reason }` for the pending undo, or null when the slot is empty. */
export function snapshotInfo() {
  const s = load("snapshot", {});
  return s.takenAt ? { takenAt: s.takenAt, reason: s.reason ?? null } : null;
}

/** Restore the snapshot and consume the slot. Returns false if it was empty. */
export function restoreSnapshot() {
  const s = load("snapshot", {});
  if (!s.envelope) return false;
  importAll(s.envelope);
  remove("snapshot");
  return true;
}

/** Throw the snapshot away without restoring it. */
export function discardSnapshot() {
  remove("snapshot");
}
