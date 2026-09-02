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
export const SCHEMA_VERSION = 1;

const key = (name) => `${NAMESPACE}:${name}`;

/**
 * Migrations run in order, each upgrading a record by exactly one version.
 * To add one: write `2: (data) => ({ ...data, newField: default })` and raise
 * SCHEMA_VERSION to 2. Keep each step small and independent.
 */
const MIGRATIONS = {
  // 2: (data) => ({ ...data, goalNote: "" }),
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
    out = step(out);
    version += 1;
  }
  return { ...out, schemaVersion: SCHEMA_VERSION };
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

  return migrate(parsed, name) ?? fallback;
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
