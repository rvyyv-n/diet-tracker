/**
 * Settings.jsx — Settings and the Look picker, built on the v3.0 surface
 * components (pass 70). From the top: the record counts and title, the
 * profile card, Appearance (the Look tiles, then Theme), Overview toggles,
 * Notifications where the platform has them, Data (export, import, updates,
 * reset) and a quiet About block. On desktop the screen is two columns:
 * Appearance on the left, everything else on the right.
 *
 * Picking a Look or a Theme goes through core/theme.js, which saves it on the
 * profile and re-applies `data-look` and `data-theme` at once, so the whole
 * app changes with the tap and survives a reload. The tiles preview each Look
 * with a nested `data-look` and `data-theme`, so they draw from their own
 * tokens.
 *
 * Expanding panels (import, undo, update, reset) open in place under their
 * row. Reset is one confirm whose copy names exactly what goes; a copy is
 * kept first so setup can offer it back.
 */

import { useEffect, useRef, useState } from "react";
import { downloadBackup } from "./js/ui/download.js";
import {
  SCHEMA_VERSION,
  clear as clearStorage,
  usedChars,
  APPROX_QUOTA,
  onWrite,
} from "./js/core/storage.js";
import {
  exportAll,
  importAll,
  assertImportable,
  countRecords,
  parseBackup,
  lastExportedAt,
  takeSnapshot,
  snapshotInfo,
  restoreSnapshot,
  discardSnapshot,
} from "./js/core/backup.js";
import {
  loadProfile,
  saveProfile,
  OVERVIEW_METRICS,
  overviewMetricShown,
} from "./js/core/profile.js";
import { hiddenFoodIds, restoreFoods } from "./js/core/foods.js";
import { setThemePref, setLookPref, resolveLook, THEME_PREFS, LOOKS } from "./js/core/theme.js";
import { phaseById } from "./js/core/plan.js";
import { humanDate } from "./js/core/dates.js";
import { APP_VERSION, REPO_URL } from "./js/core/appinfo.js";
import { checkForUpdate, updateStatus, detectBuild } from "./js/core/updates.js";
import { publish, subscribe } from "./js/core/broadcast.js";
import {
  reminderSupport,
  reminderState,
  enableReminders,
  disableReminders,
  nativeSettings,
  setNativeSetting,
} from "./js/core/reminders.js";
import {
  Button,
  Card,
  Eyebrow,
  Icon,
  Radio,
  SectionHeading,
  Segmented,
  Toggle,
} from "./components/core.jsx";
import { ConfirmPanel, ListGroup, ListRow } from "./components/surfaces.jsx";

const APP_NAME = "Rise";

const THEME_LABELS = { system: "System", light: "Light", dark: "Dark" };

/** The Looks the picker offers, with the line under each name. */
const LOOK_INFO = {
  paper: { name: "Paper", note: "Default" },
  reel: { name: "Reel", note: "Film" },
};

export default function Settings({ onEditSetup, onReset }) {
  const paneRef = useRef(null);
  const fileInputRef = useRef(null);
  const pasteRef = useRef(null);

  // The import panel: null, "choose" (file or paste), or "paste" (the textarea).
  const [importMode, setImportMode] = useState(null);
  // A parsed import waiting for confirmation: { name, obj, counts }. Or null.
  const [pending, setPending] = useState(null);
  // A message shown in place of the preview when a file can't be read or applied.
  const [importError, setImportError] = useState(null);
  // Whether the reset confirm panel is open.
  const [confirming, setConfirming] = useState(false);
  // Set when a reset's undo snapshot didn't fit: the confirm says so, and the
  // next tap erases anyway. Someone whose storage is full may be resetting
  // precisely to free space, so a failed snapshot never blocks the reset.
  const [resetNoUndo, setResetNoUndo] = useState(false);
  // The update-check row's transient phase: "idle", "checking", or "error".
  const [updatePhase, setUpdatePhase] = useState("idle");
  // The Export row's transient "Downloaded" acknowledgement.
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    const el = paneRef.current;
    el.classList.remove("tab-switching");
    void el.offsetWidth;
    el.classList.add("tab-switching");
  }, []);

  // Every completed render leaves the record fresh — tell the other panes.
  useEffect(() => {
    publish("settings");
  });

  // A sibling pane changed data this screen reads (import/reset especially) —
  // force a re-render to pick it up. Skipped when this screen was the one
  // that just published, since it's already current.
  const [, bump] = useState(0);
  useEffect(
    () =>
      subscribe((fresh) => {
        if (!fresh.has("settings")) bump((n) => n + 1);
      }),
    [],
  );

  const profile = loadProfile();
  const hiddenFoods = hiddenFoodIds(profile).length;
  const snap = snapshotInfo();
  const status = updateStatus();

  function closeImport() {
    setImportMode(null);
    setPending(null);
    setImportError(null);
  }

  function toggleImport() {
    if (importMode || pending || importError) closeImport();
    else {
      setImportMode("choose");
      setConfirming(false);
    }
  }

  function parsePasted() {
    try {
      const obj = parseBackup(pasteRef.current ? pasteRef.current.value : "");
      setPending({ name: "Pasted JSON", obj, counts: countRecords(obj) });
      setImportError(null);
    } catch (err) {
      setPending(null);
      setImportError(err.message);
    }
    setImportMode(null);
  }

  function onFileChosen(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let obj;
      try {
        obj = parseBackup(reader.result);
      } catch (err) {
        setPending(null);
        setImportError(err.message);
        setImportMode(null);
        return;
      }
      setPending({ name: file.name, obj, counts: countRecords(obj) });
      setImportError(null);
      setImportMode(null);
      setConfirming(false);
    };
    reader.readAsText(file);
    // Let the same file be chosen again later even if it's cancelled this time.
    event.target.value = "";
  }

  function commitImport() {
    if (!pending) return;
    try {
      assertImportable(pending.obj); // check before snapshotting what we overwrite
      // No undo copy, no import: write nothing rather than overwrite with no
      // way back.
      if (!takeSnapshot("import")) {
        throw new Error("Couldn't make an undo copy, storage is full. Nothing was imported.");
      }
      if (!importAll(pending.obj)) {
        throw new Error("Import failed part-way. Use Undo to restore what was there.");
      }
    } catch (err) {
      setPending(null);
      setImportError(err.message);
      return;
    }
    setPending(null);
  }

  function openReset() {
    setConfirming((v) => !v);
    setResetNoUndo(false);
    closeImport();
  }

  function commitReset() {
    if (!resetNoUndo && !takeSnapshot("reset")) {
      // Drop whatever older copy is in the slot, or setup would offer it
      // as this reset's undo after we said there isn't one.
      discardSnapshot();
      setResetNoUndo(true);
      return;
    }
    setResetNoUndo(false);
    clearStorage();
    onReset();
  }

  async function runUpdateCheck() {
    setUpdatePhase("checking");
    let ok;
    try {
      ({ ok } = await checkForUpdate({ force: true }));
    } catch {
      ok = false;
    }
    setUpdatePhase(ok ? "idle" : "error");
  }

  /** The backup as a file (ui/download.js), then a brief "Downloaded". */
  function exportDownload() {
    downloadBackup();
    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 2000);
  }

  function undoSnapshot() {
    if (restoreSnapshot()) onReset();
    else bump((n) => n + 1);
  }

  function dismissSnapshot() {
    discardSnapshot();
    bump((n) => n + 1);
  }

  return (
    <div className="pane" data-screen="settings" ref={paneRef}>
      <section className="r-settings">
        <header className="r-settings__head">
          <Eyebrow>{recordSubtitle()}</Eyebrow>
          <h1 className="r-settings__title">Settings</h1>
        </header>
        <div className="r-settings__grid">
          <Section label="Profile" icon="user" className="r-settings__sec--profile">
            <ProfileCard profile={profile} onOpen={onEditSetup} />
          </Section>

          <Section label="Appearance" icon="palette" className="r-settings__sec--appearance">
            <AppearanceCard profile={profile} bump={() => bump((n) => n + 1)} />
          </Section>

          <Section label="Overview" icon="layout-dashboard">
            <OverviewGroup profile={profile} bump={() => bump((n) => n + 1)} />
          </Section>

          {reminderSupport() === "native" ? <NativeNotificationsGroup /> : <NotificationsGroup />}

          <Section label="Data" icon="database">
            {snap ? (
              <UndoPanel snap={snap} onUndo={undoSnapshot} onDismiss={dismissSnapshot} />
            ) : null}
            <ListGroup>
              <ListRow
                title="Export data"
                icon="download"
                hint={`Save all records as a JSON file. ${exportFreshnessText()} ${storageUsedText()}`}
                trailing={
                  justDownloaded ? <span className="r-setrow__trail">Downloaded</span> : "chevron"
                }
                onClick={exportDownload}
              />
              <ListRow
                title="Import data"
                icon="upload"
                hint="Replaces what is here, after a preview."
                trailing="chevron"
                onClick={toggleImport}
              />
              <ListRow
                title="Check for updates"
                icon="refresh-cw"
                hint={updateHint(status, updatePhase)}
                trailing="chevron"
                onClick={runUpdateCheck}
              />
              {hiddenFoods ? (
                <ListRow
                  title="Restore hidden foods"
                  icon="rotate-ccw"
                  hint={`${hiddenFoods} ${hiddenFoods === 1 ? "food is" : "foods are"} hidden from the food table and the pickers.`}
                  trailing="chevron"
                  onClick={() => {
                    saveProfile(restoreFoods(profile));
                    bump((n) => n + 1);
                  }}
                />
              ) : null}
              <ListRow
                title="Reset all data"
                icon="trash"
                hint="Erases this browser's copy."
                trailing="chevron"
                danger
                onClick={openReset}
              />
            </ListGroup>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={onFileChosen}
            />
            {importMode === "choose" ? (
              <SetPanel
                actions={
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose file
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setImportMode("paste")}>
                      Paste JSON
                    </Button>
                    <Button variant="text" size="sm" onClick={closeImport}>
                      Close
                    </Button>
                  </>
                }
              >
                Import from a backup file, or paste its JSON. You see a preview before anything is
                replaced.
              </SetPanel>
            ) : null}
            {importMode === "paste" ? (
              <PastePanel
                pasteRef={pasteRef}
                onPreview={parsePasted}
                onCancel={() => setImportMode("choose")}
              />
            ) : null}
            {pending ? (
              <ImportPanel pending={pending} onCommit={commitImport} onCancel={closeImport} />
            ) : null}
            {importError ? (
              <SetPanel
                actions={
                  <Button variant="text" onClick={closeImport}>
                    Close
                  </Button>
                }
              >
                {importError}
              </SetPanel>
            ) : null}
            {status.kind === "available" ? <UpdatePanel status={status} /> : null}
            {confirming ? (
              <ResetConfirm
                noUndo={resetNoUndo}
                onConfirm={commitReset}
                onCancel={() => {
                  setConfirming(false);
                  setResetNoUndo(false);
                }}
              />
            ) : null}
          </Section>
          <Section label="About" icon="info" className="r-settings__sec--about">
            <AboutBlock />
          </Section>
        </div>
      </section>
    </div>
  );
}

/** A titled block of the screen. */
function Section({ label, icon, className, children }) {
  return (
    <section className={`r-settings__sec${className ? ` ${className}` : ""}`} aria-label={label}>
      <SectionHeading icon={icon}>{label}</SectionHeading>
      <div className="r-settings__body">{children}</div>
    </section>
  );
}

/**
 * The eyebrow under the Settings title, same register as Today's phase line
 * and Weight's week line. Carries real, screen-specific data — the stored
 * record counts — rather than a generic subline.
 */
function recordSubtitle() {
  const { days, weights, recipes } = countRecords(exportAll());
  return (
    `${days} day${days === 1 ? "" : "s"} logged · ${weights} weigh-in${weights === 1 ? "" : "s"}` +
    (recipes ? ` · ${recipes} recipe${recipes === 1 ? "" : "s"}` : "")
  );
}

/**
 * The plan at a glance — name, then phase · height · target rate — with the
 * whole card as the tap target back into the profile form.
 */
function ProfileCard({ profile, onOpen }) {
  const phase = phaseById(profile.currentPhaseId);
  const name = profile.name?.trim() || "Your profile";
  const meta = [
    phase?.name,
    profile.heightCm ? `${profile.heightCm} cm` : null,
    profile.targetRateKgPerWeek ? `+${profile.targetRateKgPerWeek} kg/wk` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const initial = profile.name?.trim() ? profile.name.trim()[0].toUpperCase() : null;

  return (
    <button className="r-setprofile" type="button" onClick={onOpen}>
      <span className="r-setprofile__avatar" aria-hidden="true">
        {initial ?? <Icon name="user" size={20} />}
      </span>
      <span className="r-setprofile__text">
        <span className="r-setprofile__name">{name}</span>
        <span className="r-setprofile__meta">{meta || "Tap to edit details"}</span>
      </span>
      <Icon name="chevronRight" size={16} className="r-setprofile__chevron" />
    </button>
  );
}

/**
 * The Look tiles and the Theme control. A tile previews its Look with a
 * nested `data-look` and the current theme, so it reads its own tokens. Both
 * choices go through core/theme.js: saved on the profile, applied at once.
 */
function AppearanceCard({ profile, bump }) {
  const look = resolveLook(profile.lookPref);
  const pref = profile.themePref || "system";
  // The resolved theme, which "System" turns into light or dark in JS.
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  return (
    <Card padding={null} className="r-appearance">
      <div className="r-appearance__row">
        <span className="r-appearance__name">Look</span>
        <span className="r-appearance__hint">Type, texture and the sun</span>
      </div>
      <div className="r-looks" role="radiogroup" aria-label="Look">
        {LOOKS.map((id) => (
          <LookTile
            key={id}
            look={id}
            theme={theme}
            name={LOOK_INFO[id].name}
            note={LOOK_INFO[id].note}
            selected={look === id}
            onPick={() => {
              setLookPref(id);
              bump();
            }}
          />
        ))}
      </div>
      <div className="r-appearance__theme">
        <span className="r-appearance__text">
          <span className="r-appearance__name">Theme</span>
          <span className="r-appearance__hint">System follows your device</span>
        </span>
        <Segmented
          label="Theme"
          value={pref}
          onChange={(v) => {
            setThemePref(v);
            bump();
          }}
          options={THEME_PREFS.map((id) => ({ value: id, label: THEME_LABELS[id] }))}
        />
      </div>
    </Card>
  );
}

/** One Look as a radio: a live preview of the Today card and its name. */
function LookTile({ look, theme, name, note, selected, onPick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${name}, ${note}`}
      className={`r-look${selected ? " is-selected" : ""}`}
      onClick={onPick}
    >
      <span className="r-look__frame">
        <span className="r-look__preview" data-look={look} data-theme={theme} aria-hidden="true">
          <span className="r-look__eyebrow">Phase 2 · Week 6</span>
          <span className="r-look__figure">2,285</span>
          <span className="r-look__horizon">
            <span className="r-look__bar" />
            <span className="r-look__sun" />
          </span>
          <span className="r-look__due">
            <span className="r-look__due-label">Due now</span>
            <span className="r-look__due-title">Snack</span>
            <span className="r-look__due-cta" />
          </span>
        </span>
      </span>
      <span className="r-look__caption">
        <Radio selected={selected} size={20} />
        <span className="r-look__name">{name}</span>
        <span className="r-look__note">{note}</span>
      </span>
    </button>
  );
}

/**
 * Show/hide the optional readouts on Today's day-total card (pass 32). One
 * row per metric (OVERVIEW_METRICS), each a Toggle whose on state is ink.
 * Stored on the profile (overviewMetrics) and read back by Today — this only
 * renders state and forwards the tap.
 */
function OverviewGroup({ profile, bump }) {
  const rows = {
    protein: {
      name: "Protein line",
      icon: "drumstick",
      hint: "Protein logged against the daily target.",
    },
    remaining: {
      name: "Remaining line",
      icon: "gauge",
      hint: "How much kcal and how many blocks remain.",
    },
  };
  function set(id, shown) {
    const p = loadProfile();
    saveProfile({ ...p, overviewMetrics: { ...p.overviewMetrics, [id]: shown } });
    bump();
  }
  return (
    <ListGroup>
      {OVERVIEW_METRICS.map((id) => (
        <ListRow
          key={id}
          title={rows[id].name}
          icon={rows[id].icon}
          hint={rows[id].hint}
          trailing={
            <Toggle
              checked={overviewMetricShown(profile, id)}
              label={rows[id].name}
              onChange={(v) => set(id, v)}
            />
          }
        />
      ))}
    </ListGroup>
  );
}

/**
 * Meal reminders on/off (pass 53). Unlike the groups above, its state isn't
 * on the profile: it is whatever the browser says (notification permission, a
 * live push subscription), read asynchronously, so the group holds it in
 * local state.
 *
 * Hidden outright where web push can't apply — the native shells have their
 * own group below (passes 54–56), and a build without VITE_PUSH_URL has no server
 * to talk to. A browser without push support still shows the group, since the
 * fix (install to the Home Screen on iOS) is something the user can act on.
 */
function NotificationsGroup() {
  const support = reminderSupport();
  const [state, setState] = useState(support === "ok" ? "loading" : support);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (support !== "ok") return;
    let live = true;
    reminderState()
      .then((s) => live && setState(s))
      .catch(() => live && setState("off"));
    return () => {
      live = false;
    };
  }, [support]);

  if (support === "native" || support === "unavailable" || support === "unconfigured") return null;

  async function choose(on) {
    if (busy || (on ? state === "on" : state !== "on")) return;
    setBusy(true);
    setError(false);
    try {
      setState(await (on ? enableReminders() : disableReminders()));
    } catch {
      setError(true);
      setState(await reminderState().catch(() => "off"));
    } finally {
      setBusy(false);
    }
  }

  let hint = "A reminder at each meal time, even with Rise closed.";
  if (state === "unsupported")
    hint =
      "This browser can't show reminders. On iPhone or iPad, add Rise to your Home Screen first.";
  if (state === "blocked")
    hint = "Notifications are blocked for Rise. Allow them in your browser's site settings.";
  if (error) hint = "Couldn't turn reminders on. Check your connection and try again.";

  const showToggle = state === "on" || state === "off" || state === "loading";

  return (
    <Section label="Notifications" icon="bell">
      <ListGroup>
        <ListRow
          title="Meal reminders"
          icon="bell"
          hint={
            <span role={error ? "alert" : undefined} aria-live={error ? undefined : "off"}>
              {hint}
            </span>
          }
          trailing={
            showToggle ? (
              <Toggle
                checked={state === "on"}
                label="Meal reminders"
                disabled={busy || state === "loading"}
                onChange={choose}
              />
            ) : null
          }
        />
      </ListGroup>
    </Section>
  );
}

/**
 * The native shells' Notifications group (passes 54–56). Android has one row,
 * Meal reminders; Windows adds Keep in tray and Start with Windows. The shell
 * holds every setting (see the native section of reminders.js), so they're
 * read once on mount and replaced with whatever the shell reports back after
 * each change.
 */
function NativeNotificationsGroup() {
  const windows = detectBuild() === "windows";
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    nativeSettings()
      .then((s) => live && setSettings(s))
      .catch(() => live && setSettings({}));
    return () => {
      live = false;
    };
  }, []);

  async function choose(key, on) {
    if (!settings || busy || Boolean(settings[key]) === on) return;
    setBusy(key);
    setError(null);
    try {
      setSettings(await setNativeSetting(key, on));
    } catch {
      setError(key);
    } finally {
      setBusy(null);
    }
  }

  const s = settings ?? {};
  let remindersHint = windows
    ? "A reminder at each meal time. Blocks you've already logged stay quiet."
    : "A reminder at each meal time, even with Rise closed. Blocks you've already logged stay quiet.";
  if (windows && s.reminders && !s.tray) {
    remindersHint =
      "Only while Rise is open. Turn on Keep in tray to get them after closing the window.";
  }
  if (s.blocked)
    remindersHint = "Notifications are blocked for Rise. Allow them in Android's app settings.";

  const rows = [{ key: "reminders", name: "Meal reminders", hint: remindersHint }];
  if (windows) {
    rows.push(
      {
        key: "tray",
        name: "Keep in tray",
        hint: "Closing the window hides Rise to the tray instead of quitting.",
      },
      {
        key: "autostart",
        name: "Start with Windows",
        hint: s.tray
          ? "Starts quietly in the tray when you sign in."
          : "Opens Rise when you sign in.",
      },
    );
  }

  return (
    <Section label="Notifications" icon="bell">
      <ListGroup>
        {rows.map(({ key, name, hint }) => (
          <ListRow
            key={key}
            title={name}
            icon="bell"
            hint={
              <span role={error === key ? "alert" : undefined}>
                {error === key ? "Couldn't change that. Try again." : hint}
              </span>
            }
            trailing={
              <Toggle
                checked={settings ? Boolean(s[key]) : false}
                label={name}
                disabled={!settings || busy === key}
                onChange={(v) => choose(key, v)}
              />
            }
          />
        ))}
      </ListGroup>
    </Section>
  );
}

// --- panels -------------------------------------------------------------

/** A quiet card that opens under a Data row: a line or two of text, then its actions. */
function SetPanel({ title, children, actions }) {
  return (
    <div className="r-setpanel">
      {title ? <p className="r-setpanel__title">{title}</p> : null}
      {children ? <div className="r-setpanel__body">{children}</div> : null}
      {actions ? <div className="r-setpanel__actions">{actions}</div> : null}
    </div>
  );
}

/**
 * The undo slot, shown whenever a snapshot is waiting (see backup.js).
 * Import and reset both take one first; this offers the single undo and a
 * way to drop it so the doubled storage is reclaimed.
 */
function UndoPanel({ snap, onUndo, onDismiss }) {
  const what = snap.reason === "reset" ? "the reset" : "the import";
  return (
    <SetPanel
      actions={
        <>
          <Button size="sm" onClick={onUndo}>
            Undo
          </Button>
          <Button variant="text" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </>
      }
    >
      The data from before {what} on {humanDate(snap.takenAt.slice(0, 10))} is still saved here.
    </SetPanel>
  );
}

/** The paste-in import route: a textarea and a Preview button. */
function PastePanel({ pasteRef, onPreview, onCancel }) {
  return (
    <SetPanel
      actions={
        <>
          <Button size="sm" onClick={onPreview}>
            Preview
          </Button>
          <Button variant="text" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="r-setpanel__line">
        Paste a backup's JSON. It goes through the same preview and replace as a file.
      </p>
      <textarea
        ref={pasteRef}
        className="r-setpanel__input"
        rows="5"
        spellCheck="false"
        autoCapitalize="off"
        placeholder="{ …backup JSON… }"
        aria-label="Backup JSON"
      />
    </SetPanel>
  );
}

function ImportPanel({ pending, onCommit, onCancel }) {
  const { name, counts, obj } = pending;
  const parts = [
    `${counts.profiles} profile${counts.profiles === 1 ? "" : "s"}`,
    `${counts.days} day${counts.days === 1 ? "" : "s"}`,
    `${counts.weights} weigh-in${counts.weights === 1 ? "" : "s"}`,
    `${counts.recipes} recipe${counts.recipes === 1 ? "" : "s"}`,
  ];
  const meta =
    (obj.exportedAt ? `Exported ${humanDate(obj.exportedAt.slice(0, 10))}` : "No export date") +
    ` · schema v${obj.schemaVersion ?? 1}`;

  return (
    <SetPanel
      title={name}
      actions={
        <>
          <Button onClick={onCommit}>Replace all data</Button>
          <Button variant="text" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="r-setpanel__line">{parts.join(" · ")}</p>
      <p className="r-setpanel__line r-setpanel__line--muted">{meta}</p>
      <p className="r-setpanel__line">
        Replacing overwrites everything in this browser. Export first if you want to keep what is
        here.
      </p>
    </SetPanel>
  );
}

/**
 * When a newer release exists: in the browser a reload (the service worker
 * already has it), in a native shell the right download. The honest note
 * about the one network request lives in the About block below.
 */
function UpdatePanel({ status }) {
  let action = null;
  if (detectBuild() === "web") {
    action = <Button onClick={() => location.reload()}>Reload to update</Button>;
  } else if (status.downloadUrl) {
    action = (
      <a
        className="r-button r-button--primary"
        href={status.downloadUrl}
        target="_blank"
        rel="noopener"
      >
        Download {status.version}
      </a>
    );
  } else if (status.releaseUrl) {
    action = (
      <a
        className="r-button r-button--primary"
        href={status.releaseUrl}
        target="_blank"
        rel="noopener"
      >
        Open the release page
      </a>
    );
  }
  return <SetPanel actions={action}>{status.version} is available.</SetPanel>;
}

function ResetConfirm({ noUndo, onConfirm, onCancel }) {
  const c = countRecords(exportAll());
  const items = [
    `${c.days} day record${c.days === 1 ? "" : "s"}`,
    `${c.weights} weigh-in${c.weights === 1 ? "" : "s"}`,
  ];
  if (c.recipes) items.push(`${c.recipes} recipe${c.recipes === 1 ? "" : "s"}`);
  const listed = items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  return (
    <div className="r-settings__confirm">
      <ConfirmPanel
        title="Erase everything?"
        body={`This removes your profile, ${listed} from this browser, and starts the plan over at week 1. ${
          noUndo
            ? "Storage is full, so this can't be undone."
            : "A copy is kept, and setup offers to restore it."
        }`}
        confirmLabel="Erase everything"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </div>
  );
}

// --- data rows ----------------------------------------------------------

/**
 * "240 KB of about 5 MB used." (pass 61) — how full Rise's storage is, as a
 * fact beside the action that keeps a copy. The limit is approximate because
 * browsers don't report it for localStorage; they all sit near 5 MB.
 */
// usedChars() reads every value, the undo copy included, so it is counted
// once and recounted only after a write.
let usedCache;
onWrite(() => {
  usedCache = undefined;
});

function storageUsedText() {
  if (usedCache === undefined) usedCache = usedChars();
  const used = usedCache;
  if (used == null) return "";
  return `${formatSize(used)} of about ${formatSize(APPROX_QUOTA)} used.`;
}

function formatSize(chars) {
  if (chars < 1024) return "Under 1 KB";
  if (chars < 1024 * 1024) return `${Math.round(chars / 1024)} KB`;
  return `${(chars / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

/** "Never exported." / "Exported today." / "Exported 3 days ago.", stated as
 * a fact on the Export row rather than a separate line — see backup.js. */
function exportFreshnessText() {
  const at = lastExportedAt();
  if (!at) return "Never exported.";
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000));
  if (ageDays === 0) return "Exported today.";
  return `Exported ${ageDays} day${ageDays === 1 ? "" : "s"} ago.`;
}

/** The update row's line: the last known state, or what the check is doing. */
function updateHint(status, phase) {
  if (phase === "checking") return "Checking…";
  if (phase === "error") return "Couldn't check. Try later.";
  if (status.kind === "unknown") return "Looks for a newer version.";
  if (status.kind === "current") return `Up to date · v${APP_VERSION}`;
  return `${status.version} available`;
}

function AboutBlock() {
  return (
    <div className="r-about">
      <p className="r-about__name">
        {APP_NAME} · v{APP_VERSION}
        <span className="r-about__schema"> · schema wgt v{SCHEMA_VERSION}</span>
      </p>
      <p className="r-about__line">Everything stays on this device.</p>
      <p className="r-about__line">
        No accounts. The only network request is the update check, and it sends nothing about you.
      </p>
      <p className="r-about__line">
        <a className="r-about__link" href={REPO_URL} target="_blank" rel="noopener">
          Source on GitHub
        </a>
        {" · "}@rvyyv-n
      </p>
    </div>
  );
}
