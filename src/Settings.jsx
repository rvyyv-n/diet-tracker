/**
 * Settings.jsx — the Settings / About tab, converted from settings.js (pass
 * 45's screen-by-screen order: Settings first, it's the least stateful of the
 * four). Same three groups (Profile, Data, a danger row) plus About, same
 * markup and classes, same `data-act` delegated-click dispatch — only the
 * storage layer underneath (core/backup.js, core/storage.js) is unchanged;
 * everything view-local moved from module-level `let`s to `useState`.
 *
 * `justOpened()` still does the one-shot entrance-class job it always did:
 * React re-renders this component in place on every state change here (it
 * never remounts mid-visit — only a nav tap away and back does that), so a
 * panel toggling open needs the same "was this open last render" bookkeeping
 * the vanilla screen needed, not a mount effect. It's called unconditionally
 * every render, per its own contract.
 */

import { useEffect, useRef, useState } from "react";
import { justOpened } from "./js/ui/dom.js";
import { iconSvg } from "./js/ui/icons.js";
import { SCHEMA_VERSION, clear as clearStorage } from "./js/core/storage.js";
import {
  exportAll,
  importAll,
  assertImportable,
  countRecords,
  parseBackup,
  noteExport,
  lastExportedAt,
  takeSnapshot,
  snapshotInfo,
  restoreSnapshot,
  discardSnapshot,
} from "./js/core/backup.js";
import { loadProfile, saveProfile, OVERVIEW_METRICS, overviewMetricShown } from "./js/core/profile.js";
import { setThemePref, THEME_PREFS } from "./js/core/theme.js";
import { phaseById } from "./js/core/plan.js";
import { humanDate, todayISO } from "./js/core/dates.js";
import { APP_VERSION, REPO_URL } from "./js/core/appinfo.js";
import { checkForUpdate, updateStatus, detectBuild } from "./js/core/updates.js";
import { publish, subscribe } from "./js/core/broadcast.js";

const APP_NAME = "Rise";

/**
 * `className` decides what box (if any) this renders. Pass one when the icon
 * itself is the sized element (`group__label-icon` — a real span carrying
 * that class, containing the svg, same as the vanilla `groupLabel()` helper
 * it replaces). Omit it when the caller already renders its own sizing
 * wrapper (`set2-row__icon`, `set2-row__chev`, `set2-profile__avatar` all
 * expect the `<svg>` as their own direct flex item, sized via
 * `<wrapper> svg { width/height: 100% }`) — `display: contents` keeps this
 * component from adding a second, unsized box in between.
 */
function Icon({ name, size, stroke, className }) {
  const html = { __html: iconSvg(name, { size, stroke }) };
  if (className) return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={html} />;
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={html} />;
}

function GroupLabel({ icon, children }) {
  return (
    <span className="group__label">
      {icon ? <Icon name={icon} size={14} className="group__label-icon" /> : null}
      {children}
    </span>
  );
}

export default function Settings({ onEditSetup, onReset }) {
  const paneRef = useRef(null);
  const fileInputRef = useRef(null);
  const pasteRef = useRef(null);

  // A parsed import waiting for confirmation: { name, obj, counts }. Or null.
  const [pending, setPending] = useState(null);
  // A message shown in place of the preview when a file can't be read or applied.
  const [importError, setImportError] = useState(null);
  // Whether the paste-JSON textarea panel is open.
  const [pasteOpen, setPasteOpen] = useState(false);
  // Whether the reset confirm panel is open.
  const [confirming, setConfirming] = useState(false);
  // The update-check row's transient phase: "idle", "checking", or "error".
  const [updatePhase, setUpdatePhase] = useState("idle");
  // The Export row's transient "Downloaded" acknowledgement.
  const [justDownloaded, setJustDownloaded] = useState(false);

  // Fire the entry crossfade once, the same visit-level "just arrived" moment
  // the router's crossfade() used to trigger — this only runs on mount, not
  // on every state change within a visit.
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
  useEffect(() => subscribe((fresh) => {
    if (!fresh.has("settings")) bump((n) => n + 1);
  }), []);

  const profile = loadProfile();
  const snap = snapshotInfo();
  const status = updateStatus();

  // Computed unconditionally, every render — justOpened() needs a call every
  // time (even a false one) to keep its "was open" bookkeeping honest.
  const undoJustOpened = justOpened("settings.undo", Boolean(snap));
  const pasteJustOpened = justOpened("settings.paste", pasteOpen);
  const importJustOpened = justOpened("settings.import", Boolean(pending));
  const errorJustOpened = justOpened("settings.importError", Boolean(importError));
  const updateJustOpened = justOpened("settings.update", status.kind === "available");
  const confirmJustOpened = justOpened("settings.resetConfirm", confirming);

  function onAction(event) {
    const target = event.target.closest("[data-act]");
    if (!target) return;
    const act = target.getAttribute("data-act");

    switch (act) {
      case "edit-setup":
        onEditSetup();
        break;
      case "theme-set":
        setThemePref(target.getAttribute("data-pref"));
        bump((n) => n + 1);
        break;
      case "overview-set": {
        const id = target.getAttribute("data-metric");
        const shown = target.getAttribute("data-shown") === "1";
        const p = loadProfile();
        saveProfile({ ...p, overviewMetrics: { ...p.overviewMetrics, [id]: shown } });
        bump((n) => n + 1);
        break;
      }
      case "export-download":
        exportDownload();
        break;
      case "import-pick":
        if (pending || importError) {
          setPending(null);
          setImportError(null);
        } else {
          setPasteOpen(false);
          fileInputRef.current?.click();
        }
        break;
      case "import-paste":
        setPasteOpen((v) => !v);
        setPending(null);
        setImportError(null);
        break;
      case "import-paste-parse": {
        try {
          const obj = parseBackup(pasteRef.current ? pasteRef.current.value : "");
          setPending({ name: "Pasted JSON", obj, counts: countRecords(obj) });
          setImportError(null);
        } catch (err) {
          setPending(null);
          setImportError(err.message);
        }
        setPasteOpen(false);
        break;
      }
      case "import-paste-close":
        setPasteOpen(false);
        break;
      case "import-commit":
        commitImport();
        break;
      case "import-cancel":
        setPending(null);
        setImportError(null);
        break;
      case "snapshot-undo":
        if (restoreSnapshot()) onReset();
        else bump((n) => n + 1);
        break;
      case "snapshot-dismiss":
        discardSnapshot();
        bump((n) => n + 1);
        break;
      case "reset-open":
        setConfirming((v) => !v);
        setPending(null);
        setImportError(null);
        setPasteOpen(false);
        break;
      case "reset-commit":
        takeSnapshot("reset");
        clearStorage();
        onReset();
        break;
      case "reset-cancel":
        setConfirming(false);
        break;
      case "update-check":
        runUpdateCheck();
        break;
      case "update-reload":
        location.reload();
        break;
      default:
        break;
    }
  }

  async function runUpdateCheck() {
    setUpdatePhase("checking");
    let ok = false;
    try {
      ({ ok } = await checkForUpdate({ force: true }));
    } catch {
      ok = false;
    }
    setUpdatePhase(ok ? "idle" : "error");
  }

  /**
   * A file download, not a clipboard copy (pass 17). navigator.clipboard is
   * undefined outside a secure context — any origin that isn't https or
   * localhost, which includes a plain LAN IP — so a clipboard write used to
   * throw before either branch of its `.then()` ever ran: the button did
   * visibly nothing. A Blob download needs no permission and no secure
   * context, so it works everywhere the app does.
   */
  function exportDownload() {
    const json = JSON.stringify(exportAll(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rise-backup-${todayISO()}.json`;
    // Safari needs the anchor actually in the DOM for .click() to trigger a
    // real download rather than silently no-op — same family of issue as the
    // clipboard one above, so not worth risking again.
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    noteExport();

    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 2000);
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
        return;
      }
      setPending({ name: file.name, obj, counts: countRecords(obj) });
      setImportError(null);
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
      takeSnapshot("import");
      importAll(pending.obj);
    } catch (err) {
      setPending(null);
      setImportError(err.message);
      return;
    }
    setPending(null);
  }

  return (
    <div className="pane" data-screen="settings" ref={paneRef}>
      <section className="screen settings2" onClick={onAction}>
        <div className="screen-head">
          <h1 className="screen__title screen__title--lg">Settings</h1>
          <p className="phase-banner">{recordSubtitle()}</p>
        </div>

        <ProfileGroup profile={profile} />
        <AppearanceGroup profile={profile} />
        <OverviewGroup profile={profile} />

        <div className="group">
          <GroupLabel icon="database">Data</GroupLabel>
          <div className="card set2-card">
            {snap ? <UndoRow snap={snap} justOpenedNow={undoJustOpened} /> : null}
            <ExportItem justDownloaded={justDownloaded} />
            <ImportRow pending={pending} importError={importError} pasteOpen={pasteOpen} fileInputRef={fileInputRef} onFileChosen={onFileChosen} />
            {pasteOpen ? <PastePanel justOpenedNow={pasteJustOpened} pasteRef={pasteRef} /> : null}
            {pending ? <ImportPanel pending={pending} justOpenedNow={importJustOpened} /> : null}
            {importError ? <ErrorPanel message={importError} justOpenedNow={errorJustOpened} /> : null}
          </div>
        </div>

        <ActionsGroup
          status={status}
          updatePhase={updatePhase}
          updateJustOpened={updateJustOpened}
          confirming={confirming}
          confirmJustOpened={confirmJustOpened}
        />

        <AboutBlock />
      </section>
    </div>
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
 * A card that stands in for the old "Edit setup" row: the plan at a glance —
 * name, then phase · height · target rate — with the whole card as the tap
 * target back into the profile form.
 */
function ProfileGroup({ profile }) {
  const phase = phaseById(profile.currentPhaseId);
  const name = profile.name?.trim() || "Your profile";
  const meta = [
    phase?.name,
    profile.heightCm ? `${profile.heightCm} cm` : null,
    profile.targetRateKgPerWeek ? `+${profile.targetRateKgPerWeek} kg/wk` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group">
      <GroupLabel icon="user">Profile</GroupLabel>
      <div className="card set2-card">
        <button className="set2-profile" type="button" data-act="edit-setup">
          <span className="set2-profile__avatar" aria-hidden="true">
            <Icon name="user" />
          </span>
          <span className="set2-profile__body">
            <span className="set2-profile__name">{name}</span>
            <span className="set2-profile__meta">{meta || "Tap to edit details"}</span>
          </span>
          <span className="set2-row__chev" aria-hidden="true">
            <Icon name="chevron-right" size={16} stroke={2} />
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * The theme toggle (pass 19). "System" — the default — follows the OS
 * `prefers-color-scheme`; "Light" / "Dark" pin it. The choice is stored on
 * the profile and applied by core/theme.js, which also runs the cross-fade,
 * so this only has to render the current state and forward the tap.
 */
function AppearanceGroup({ profile }) {
  const pref = profile.themePref || "system";
  const labels = { system: "System", light: "Light", dark: "Dark" };
  return (
    <div className="group">
      <GroupLabel icon="palette">Appearance</GroupLabel>
      <div className="card set2-card set2-appearance">
        <div className="set2-appearance__head">
          <span className="set2-appearance__name">Theme</span>
          <span className="set2-appearance__hint">System follows your device.</span>
        </div>
        <div className="seg seg--full" role="group" aria-label="Theme">
          {THEME_PREFS.map((id) => (
            <button
              key={id}
              className={`seg__btn${pref === id ? " is-on" : ""}`}
              type="button"
              data-act="theme-set"
              data-pref={id}
              aria-pressed={pref === id ? "true" : "false"}
            >
              {labels[id]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Show/hide the optional readouts on Today's day-total card (pass 32). One
 * row per metric (OVERVIEW_METRICS), sharing the Appearance block's name +
 * hint + full-width segment. Stored on the profile (overviewMetrics) and
 * read back by today.js — this only renders state and forwards the tap.
 */
function OverviewGroup({ profile }) {
  const rows = {
    protein: { name: "Protein line", hint: "Protein logged against the daily target." },
    remaining: { name: "Remaining line", hint: "How much kcal and how many blocks remain." },
  };
  return (
    <div className="group">
      <GroupLabel icon="layout-dashboard">Overview</GroupLabel>
      <div className="card set2-card">
        {OVERVIEW_METRICS.map((id) => {
          const shown = overviewMetricShown(profile, id);
          return (
            <div key={id} className="set2-appearance set2-overview__row">
              <div className="set2-appearance__head">
                <span className="set2-appearance__name">{rows[id].name}</span>
                <span className="set2-appearance__hint">{rows[id].hint}</span>
              </div>
              <div className="seg seg--full" role="group" aria-label={rows[id].name}>
                {[true, false].map((want) => (
                  <button
                    key={String(want)}
                    className={`seg__btn${want === shown ? " is-on" : ""}`}
                    type="button"
                    data-act="overview-set"
                    data-metric={id}
                    data-shown={want ? "1" : ""}
                    aria-pressed={want === shown ? "true" : "false"}
                  >
                    {want ? "Show" : "Hide"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The undo slot's row, shown whenever a snapshot is waiting (see backup.js).
 * Import and reset both take one first; this offers the single undo and a
 * way to drop it so the doubled storage is reclaimed.
 */
function UndoRow({ snap, justOpenedNow }) {
  const what = snap.reason === "reset" ? "the reset" : "the import";
  return (
    <div className={`set-panel set-panel--undo${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-panel__body">
        The data from before {what} on {humanDate(snap.takenAt.slice(0, 10))} is still saved here.
      </p>
      <div className="set-panel__actions">
        <button className="btn btn--primary btn--sm" type="button" data-act="snapshot-undo">Undo</button>
        <button className="btn btn--text btn--sm" type="button" data-act="snapshot-dismiss">Dismiss</button>
      </div>
    </div>
  );
}

/** The paste-in import route: a textarea and a Preview button. */
function PastePanel({ justOpenedNow, pasteRef }) {
  return (
    <div className={`set-panel${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-panel__body">Paste a backup's JSON. It goes through the same preview and replace as a file.</p>
      <textarea
        ref={pasteRef}
        className="set-paste__input"
        rows="5"
        spellCheck="false"
        autoCapitalize="off"
        placeholder="{ …backup JSON… }"
        aria-label="Backup JSON"
      />
      <div className="set-panel__actions">
        <button className="btn btn--primary btn--sm" type="button" data-act="import-paste-parse">Preview</button>
        <button className="btn btn--text btn--sm" type="button" data-act="import-paste-close">Cancel</button>
      </div>
    </div>
  );
}

function ErrorPanel({ message, justOpenedNow }) {
  return (
    <div className={`set-panel${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-panel__body">{message}</p>
      <div className="set-panel__actions">
        <button className="btn btn--text" type="button" data-act="import-cancel">Close</button>
      </div>
    </div>
  );
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

function ExportItem({ justDownloaded }) {
  return (
    <div className="set2-row set2-row--static">
      <span className="set2-row__icon" aria-hidden="true">
        <Icon name="download" />
      </span>
      <span className="set2-row__body">
        <span className="set2-row__name">Export data</span>
        <span className="set2-row__desc">Save all records as a JSON file. {exportFreshnessText()}</span>
      </span>
      <button className="btn btn--secondary btn--sm" type="button" data-act="export-download">
        {justDownloaded ? "Downloaded" : "Download JSON"}
      </button>
    </div>
  );
}

function ImportRow({ pending, importError, pasteOpen, fileInputRef, onFileChosen }) {
  return (
    <div className="set2-row set2-row--static">
      <span className="set2-row__icon" aria-hidden="true">
        <Icon name="upload" />
      </span>
      <span className="set2-row__body">
        <span className="set2-row__name">Import data</span>
        <span className="set2-row__desc">Replaces what is here, after a preview.</span>
      </span>
      <span className="set2-row__buttons">
        <button className="btn btn--secondary btn--sm" type="button" data-act="import-pick">
          {pending || importError ? "Close" : "Choose file"}
        </button>
        <button className="btn btn--secondary btn--sm" type="button" data-act="import-paste">
          {pasteOpen ? "Close" : "Paste"}
        </button>
      </span>
      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={onFileChosen} />
    </div>
  );
}

function ImportPanel({ pending, justOpenedNow }) {
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
    <div className={`set-panel${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-panel__title">{name}</p>
      <p className="set-panel__stats">{parts.join(" · ")}</p>
      <p className="set-panel__meta">{meta}</p>
      <p className="set-panel__body">
        Replacing overwrites everything in this browser. Export first if you want to keep what is here.
      </p>
      <div className="set-panel__actions">
        <button className="btn btn--primary" type="button" data-act="import-commit">Replace all data</button>
        <button className="btn btn--text" type="button" data-act="import-cancel">Cancel</button>
      </div>
    </div>
  );
}

/**
 * The two plain rows under a divider: "Check for updates" and "Reset all
 * data". The update check is tappable any time and also runs on its own at
 * most once a week from main.jsx; its trailing word comes from the stored
 * wgt:update record, so it reads sensibly offline. When a newer release
 * exists the panel below the row links to the right download (or, in the
 * browser, a reload — the service worker already has it). The honest note
 * about the one network request lives in the About block below.
 */
function ActionsGroup({ status, updatePhase, updateJustOpened, confirming, confirmJustOpened }) {
  let trail;
  if (updatePhase === "checking") trail = "Checking…";
  else if (updatePhase === "error") trail = "Try later";
  else if (status.kind === "unknown") trail = "";
  else if (status.kind === "current") trail = "Up to date";
  else trail = `${status.version} available`;

  return (
    <div className="set2-actions">
      <button className="set2-row" type="button" data-act="update-check">
        <span className="set2-row__icon" aria-hidden="true">
          <Icon name="refresh-cw" />
        </span>
        <span className="set2-row__body">
          <span className="set2-row__name">Check for updates</span>
        </span>
        {trail ? <span className="set2-row__trail">{trail}</span> : null}
      </button>
      {status.kind === "available" ? <UpdatePanel status={status} justOpenedNow={updateJustOpened} /> : null}
      <button className="set2-row" type="button" data-act="reset-open">
        <span className="set2-row__icon" aria-hidden="true">
          <Icon name="rotate-ccw" />
        </span>
        <span className="set2-row__body">
          <span className="set2-row__name">Reset all data</span>
        </span>
      </button>
      {confirming ? <ResetConfirm justOpenedNow={confirmJustOpened} /> : null}
    </div>
  );
}

function UpdatePanel({ status, justOpenedNow }) {
  let action = null;
  if (detectBuild() === "web") {
    action = <button className="btn btn--primary" type="button" data-act="update-reload">Reload to update</button>;
  } else if (status.downloadUrl) {
    action = (
      <a className="btn btn--primary" href={status.downloadUrl} target="_blank" rel="noopener">
        Download {status.version}
      </a>
    );
  } else if (status.releaseUrl) {
    action = (
      <a className="btn btn--primary" href={status.releaseUrl} target="_blank" rel="noopener">
        Open the release page
      </a>
    );
  }
  return (
    <div className={`set-panel${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-panel__body">{status.version} is available.</p>
      {action ? <div className="set-panel__actions">{action}</div> : null}
    </div>
  );
}

function ResetConfirm({ justOpenedNow }) {
  const c = countRecords(exportAll());
  const items = [
    `${c.days} day record${c.days === 1 ? "" : "s"}`,
    `${c.weights} weigh-in${c.weights === 1 ? "" : "s"}`,
  ];
  if (c.recipes) items.push(`${c.recipes} recipe${c.recipes === 1 ? "" : "s"}`);
  const listed = items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  return (
    <div className={`set-confirm${justOpenedNow ? " is-entering" : ""}`}>
      <p className="set-confirm__title">Erase everything?</p>
      <p className="set-confirm__body">
        This removes your profile, {listed} from this browser, and starts the plan over at week 1. It cannot be
        undone.
      </p>
      <div className="set-confirm__actions">
        <button className="btn btn--danger" type="button" data-act="reset-commit">Erase everything</button>
        <button className="btn btn--text" type="button" data-act="reset-cancel">Cancel</button>
      </div>
    </div>
  );
}

function AboutBlock() {
  return (
    <div className="about2">
      <div className="about2__group">
        <p className="about2__name">{APP_NAME} · v{APP_VERSION}</p>
        <p className="about2__schema">schema wgt v{SCHEMA_VERSION}</p>
      </div>
      <div className="about2__group">
        <p className="about2__line">Everything stays on this device.</p>
        <p className="about2__line">No accounts. The only network request is the update check, and it sends nothing about you.</p>
      </div>
      <p className="about2__links">
        <a className="about2__link" href={REPO_URL} target="_blank" rel="noopener">Source on GitHub</a>
        <span className="about2__sep" aria-hidden="true">·</span>
        <span className="about2__sig">@rvyyv-n</span>
      </p>
    </div>
  );
}
