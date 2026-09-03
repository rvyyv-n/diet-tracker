/**
 * storage.js — the only place the app talks to localStorage.
 *
 * Everything is funnelled through here for one reason: every stored record
 * carries a `schemaVersion`. When a later version of the app adds or renames a
 * field, old saved data still loads — it gets migrated on read instead of
 * throwing, or worse, being silently wiped. Retrofitting that later would mean
 * asking existing users to start over.
 */

const NAMESPACE = "wgt";

/** Bump when a record's shape changes, and add a matching migration step. */
export const SCHEMA_VERSION = 3;

const key = (name) => `${NAMESPACE}:${name}`;

/**
 * Migrations run in order, each upgrading a record by exactly one version.
 * SCHEMA_VERSION is one number shared by every named record (profile, days,
 * weights, ...), so a step receives `name` and must pass through anything it
 * doesn't own unchanged — only branch for the record whose shape actually
 * moved. To add one: write `3: (data, name) => name === "days" ? ... : data`
 * and raise SCHEMA_VERSION to 3. Keep each step small and independent.
 */
const MIGRATIONS = {
  // v2 (pass 23): `extras` has been seeded on every NEW day (see
  // core/day.js newDay()) since it was reserved for v2, but never backfilled
  // onto days recorded before that line landed, so an existing user's older
  // day records are missing the key outright. Pass 24 makes extras
  // load-bearing (dayTotals() starts summing it), so every stored day needs
  // the key before that ships — this migration guarantees it up front rather
  // than leaning on a `?? []` at every future read site.
  2: (data, name) => {
    if (name !== "days") return data;
    const days = Object.fromEntries(
      Object.entries(data.days ?? {}).map(([iso, day]) => [iso, { extras: [], ...day }])
    );
    return { ...data, days };
  },

  // v3 (pass 28): a recipe gains an `items` list — the ingredients it's built
  // from — and its kcal / protein become the sum of them. Recipes saved by
  // pass 26 are flat ({ name, kcal, proteinG }); give each a single item
  // mirroring its own totals so pass 28 can read `recipe.items` directly
  // rather than falling back at the call site (same reasoning as the v2 step).
  3: (data, name) => {
    if (name !== "recipes") return data;
    const recipes = (Array.isArray(data.recipes) ? data.recipes : []).map((r) =>
      Array.isArray(r.items)
        ? r
        : { ...r, items: [{ name: r.name, kcal: r.kcal ?? 0, proteinG: r.proteinG ?? 0 }] }
    );
    return { ...data, recipes };
  },
};

function migrate(data, name) {
  let version = data.schemaVersion ?? 1;
  let out = data;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version + 1];
    if (!step) {
      console.warn(`No migration to v${version + 1} for "${name}"; using defaults.`);
      return null;
    }
    out = step(out, name);
    version += 1;
  }
  return { ...out, schemaVersion: SCHEMA_VERSION };
}

/**
 * Run a record through the same migration ladder `load()` uses, for a record
 * that came from somewhere other than localStorage — namely an imported
 * backup (backup.js). That path matters because `save()` always stamps the
 * CURRENT SCHEMA_VERSION onto whatever it's given: writing an old backup's
 * record straight through `save()` without migrating it first would mark
 * un-migrated data as already current, so the real migration would never run
 * on it. Falls back like `load()` does — bad input or a version this build
 * doesn't understand yields `fallback`, never a throw.
 */
export function migrateRecord(data, name, fallback = {}) {
  if (!data || typeof data !== "object") return fallback;
  return migrate(data, name) ?? fallback;
}

/**
 * Read a record. Returns `fallback` if it is missing, unreadable, or stored by
 * a NEWER version of the app than this one understands — never guess at data
 * from the future.
 */
export function load(name, fallback) {
  let raw;
  try {
    raw = localStorage.getItem(key(name));
  } catch {
    // Private browsing and some locked-down profiles throw on access.
    return fallback;
  }
  if (raw === null) return fallback;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`Corrupt record "${name}"; falling back to defaults.`);
    return fallback;
  }
  if (parsed === null || typeof parsed !== "object") return fallback;
  if ((parsed.schemaVersion ?? 1) > SCHEMA_VERSION) return fallback;

  return migrateRecord(parsed, name, fallback);
}

/** Write a record, stamping it with the current schema version. */
export function save(name, data) {
  try {
    localStorage.setItem(
      key(name),
      JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION })
    );
    return true;
  } catch (err) {
    // Quota exceeded, or storage disabled entirely.
    console.error(`Could not save "${name}":`, err);
    return false;
  }
}

export function remove(name) {
  try {
    localStorage.removeItem(key(name));
  } catch {
    /* nothing useful to do */
  }
}

/**
 * Records that survive a "reset all data". Only the undo snapshot: a reset that
 * could not be undone would defeat the point of taking one. backup.js writes
 * and consumes it.
 */
const PRESERVE_ON_CLEAR = new Set([key("snapshot")]);

/**
 * Remove every record this app owns — the "reset all data" path. Only keys under
 * the `wgt:` namespace are touched, so anything else on the origin is left alone,
 * and the undo snapshot (see PRESERVE_ON_CLEAR) is kept so the reset is
 * reversible.
 */
export function clear() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${NAMESPACE}:`) && !PRESERVE_ON_CLEAR.has(k)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing useful to do */
  }
}

/** True when localStorage is actually usable — worth checking on first run. */
export function isAvailable() {
  try {
    const probe = key("__probe");
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
