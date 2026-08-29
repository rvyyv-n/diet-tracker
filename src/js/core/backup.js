/**
 * backup.js — the whole of the app's state as one JSON object, for export and
 * import on the Settings screen.
 *
 * Everything the app knows lives in three localStorage records: `wgt:profile`,
 * `wgt:days` and `wgt:weights`. This module reads all three into one envelope
 * and writes them back from one. It does not own any UI — settings.js drives it
 * — and it never clears storage; a replace overwrites the three keys in place.
 */

import { load, save, SCHEMA_VERSION } from "./storage.js";

/** One object holding every record, stamped so an import can check its age. */
export function exportAll() {
  return {
    app: "diet-tracker",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: load("profile", {}),
    days: load("days", { days: {} }),
    weights: load("weights", { weights: {} }),
  };
}

/**
 * Overwrite the three records from a parsed export object. Throws with a
 * user-facing message if the object is not a backup, or is from a newer schema
 * than this build understands — never migrate data forward blindly.
 */
export function importAll(obj) {
  if (!obj || typeof obj !== "object") {
    throw new Error("That file is not a backup.");
  }
  if ((obj.schemaVersion ?? 1) > SCHEMA_VERSION) {
    throw new Error("This backup is from a newer version.");
  }
  save("profile", obj.profile ?? {});
  save("days", obj.days ?? { days: {} });
  save("weights", obj.weights ?? { weights: {} });
}

/** Counts for the import preview: profiles, day records, weigh-ins. */
export function countRecords(obj) {
  const hasProfile =
    obj?.profile && obj.profile.heightCm != null && obj.profile.startWeightKg != null;
  return {
    profiles: hasProfile ? 1 : 0,
    days: Object.keys(obj?.days?.days ?? {}).length,
    weights: Object.keys(obj?.weights?.weights ?? {}).length,
  };
}
