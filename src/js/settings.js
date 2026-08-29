/**
 * settings.js — the Settings / About tab.
 *
 * Three groups: Profile (a card summarising the plan, tap to edit), Data
 * (export, import, with an import-preview panel), and a danger row that resets
 * everything behind a confirm panel. Then a quiet About block.
 *
 * This screen is view-only over storage — all reading and writing of records
 * goes through core/backup.js and core/storage.js. A single delegated handler
 * dispatches on `data-act`; every action ends by mutating module state and
 * re-rendering, except the two transient acknowledgements (Copied / Saved),
 * which touch the live DOM directly so a re-render doesn't blow them away.
 *
 * Copy convention: sentence case, matching the rest of the app.
 */

import { el } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
import { SCHEMA_VERSION, clear as clearStorage } from "./core/storage.js";
import { exportAll, importAll, countRecords } from "./core/backup.js";
import { loadProfile } from "./core/profile.js";
import { phaseById } from "./core/plan.js";
import { humanDate } from "./core/dates.js";

const APP_NAME = "Rise";
const VERSION = "1.0.0";
const REPO_URL = "https://github.com/rvyyv-n/diet-tracker";

let mount;
let onEditSetup = () => {};
let onReset = () => {};

// A parsed import waiting for confirmation: { name, obj, counts }. Or null.
let pending = null;
// A message shown in place of the preview when a file can't be read or applied.
let importError = null;
// Whether the reset confirm panel is open.
let confirming = false;
// The hidden <input type="file">, kept across renders so its click reopens it.
let fileInput;

export function renderSettings(mountEl, opts = {}) {
  mount = mountEl;
  onEditSetup = typeof opts.onEditSetup === "function" ? opts.onEditSetup : () => {};
  onReset = typeof opts.onReset === "function" ? opts.onReset : () => {};
  pending = null;
  importError = null;
  confirming = false;
  render();
}

// --- render ------------------------------------------------------------

function render() {
  const section = el(
    "section",
    { class: "screen settings2" },
    el(
      "div",
      { class: "screen-head" },
      el("h1", { class: "screen__title screen__title--lg" }, "Settings"),
      el("p", { class: "phase-banner" }, "Setup, data and about"),
    ),
    profileGroup(),
    dataGroup(),
    dangerGroup(),
    aboutBlock(),
  );
  section.addEventListener("click", onAction);
  mount.replaceChildren(section);
}

/**
 * A card that stands in for the old "Edit setup" row: the plan at a glance —
 * name, then phase · height · target rate — with the whole card as the tap
 * target back into the profile form.
 */
function profileGroup() {
  const profile = loadProfile();
  const phase = phaseById(profile.currentPhaseId);

  const name = profile.name?.trim() || "Your profile";
  const meta = [
    phase?.name,
    profile.heightCm ? `${profile.heightCm} cm` : null,
    profile.targetRateKgPerWeek ? `+${profile.targetRateKgPerWeek} kg/wk` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return el(
    "div",
    { class: "group" },
    el("span", { class: "group__label" }, "Profile"),
    el(
      "div",
      { class: "card set2-card" },
      el(
        "button",
        { class: "set2-profile", type: "button", "data-act": "edit-setup" },
        el("span", { class: "set2-profile__avatar", "aria-hidden": "true" }, icon("user")),
        el(
          "span",
          { class: "set2-profile__body" },
          el("span", { class: "set2-profile__name" }, name),
          el("span", { class: "set2-profile__meta" }, meta || "Tap to edit details"),
        ),
        el("span", { class: "set2-row__chev", "aria-hidden": "true" }, icon("chevron-right", { size: 16, stroke: 2 })),
      ),
    ),
  );
}

function dataGroup() {
  return el(
    "div",
    { class: "group" },
    el("span", { class: "group__label" }, "Data"),
    el(
      "div",
      { class: "card set2-card" },
      exportItem(),
      importRow(),
      pending ? importPanel() : null,
      importError ? errorPanel() : null,
    ),
  );
}

function errorPanel() {
  return el(
    "div",
    { class: "set-panel" },
    el("p", { class: "set-panel__body" }, importError),
    el(
      "div",
      { class: "set-panel__actions" },
      el("button", { class: "btn btn--text", type: "button", "data-act": "import-cancel" }, "Close"),
    ),
  );
}

function exportItem() {
  return el(
    "div",
    { class: "set2-item" },
    el(
      "button",
      { class: "set2-row", type: "button", "data-act": "export-copy" },
      el("span", { class: "set2-row__icon", "aria-hidden": "true" }, icon("download")),
      el(
        "span",
        { class: "set2-row__body" },
        el("span", { class: "set2-row__name" }, "Export data"),
      ),
      el("span", { class: "ack", hidden: "" }, "Copied"),
    ),
    el(
      "button",
      { class: "set2-sub", type: "button", "data-act": "export-file" },
      el("span", { class: "set2-sub__icon", "aria-hidden": "true" }, icon("arrow-down-to-line", { size: 15 })),
      el("span", {}, "Download file"),
    ),
  );
}

function importRow() {
  fileInput = el("input", { type: "file", accept: "application/json,.json", hidden: "" });
  fileInput.addEventListener("change", onFileChosen);
  return el(
    "div",
    { class: "set2-row set2-row--static" },
    el("span", { class: "set2-row__icon", "aria-hidden": "true" }, icon("upload")),
    el(
      "span",
      { class: "set2-row__body" },
      el("span", { class: "set2-row__name" }, "Import data"),
      el("span", { class: "set2-row__desc" }, "Replaces what is here, after a preview."),
    ),
    el(
      "button",
      { class: "btn btn--secondary btn--sm", type: "button", "data-act": "import-pick" },
      pending || importError ? "Close" : "Choose file",
    ),
    fileInput,
  );
}

function importPanel() {
  const { name, counts, obj } = pending;
  const parts = [
    `${counts.profiles} profile${counts.profiles === 1 ? "" : "s"}`,
    `${counts.days} day${counts.days === 1 ? "" : "s"}`,
    `${counts.weights} weigh-in${counts.weights === 1 ? "" : "s"}`,
  ];
  const meta =
    (obj.exportedAt ? `Exported ${humanDate(obj.exportedAt.slice(0, 10))}` : "No export date") +
    ` · schema v${obj.schemaVersion ?? 1}`;

  return el(
    "div",
    { class: "set-panel" },
    el("p", { class: "set-panel__title" }, name),
    el("p", { class: "set-panel__stats" }, parts.join(" · ")),
    el("p", { class: "set-panel__meta" }, meta),
    el(
      "p",
      { class: "set-panel__body" },
      "Replacing overwrites everything in this browser. Export first if you want to keep what is here.",
    ),
    el(
      "div",
      { class: "set-panel__actions" },
      el("button", { class: "btn btn--primary", type: "button", "data-act": "import-commit" }, "Replace all data"),
      el("button", { class: "btn btn--text", type: "button", "data-act": "import-cancel" }, "Cancel"),
    ),
  );
}

function dangerGroup() {
  return el(
    "div",
    { class: "set2-danger" },
    el(
      "button",
      { class: "set2-row", type: "button", "data-act": "reset-open" },
      el("span", { class: "set2-row__icon", "aria-hidden": "true" }, icon("rotate-ccw")),
      el(
        "span",
        { class: "set2-row__body" },
        el("span", { class: "set2-row__name" }, "Reset all data"),
      ),
    ),
    confirming ? resetConfirm() : null,
  );
}

function resetConfirm() {
  const c = countRecords(exportAll());
  return el(
    "div",
    { class: "set-confirm" },
    el("p", { class: "set-confirm__title" }, "Erase everything?"),
    el(
      "p",
      { class: "set-confirm__body" },
      `This removes your profile, ${c.days} day record${c.days === 1 ? "" : "s"} and ` +
        `${c.weights} weigh-in${c.weights === 1 ? "" : "s"} from this browser, and starts the ` +
        "plan over at week 1. It cannot be undone.",
    ),
    el(
      "div",
      { class: "set-confirm__actions" },
      el("button", { class: "btn btn--danger", type: "button", "data-act": "reset-commit" }, "Erase everything"),
      el("button", { class: "btn btn--text", type: "button", "data-act": "reset-cancel" }, "Cancel"),
    ),
  );
}

function aboutBlock() {
  return el(
    "div",
    { class: "about2" },
    el(
      "div",
      { class: "about2__group" },
      el("p", { class: "about2__name" }, `${APP_NAME} · v${VERSION}`),
      el("p", { class: "about2__schema" }, `schema wgt v${SCHEMA_VERSION}`),
    ),
    el(
      "div",
      { class: "about2__group" },
      el("p", { class: "about2__line" }, "Everything stays on this device."),
      el("p", { class: "about2__line" }, "No accounts, no network."),
    ),
    el(
      "p",
      { class: "about2__links" },
      el("a", { class: "about2__link", href: REPO_URL, target: "_blank", rel: "noopener" }, "Source on GitHub"),
      el("span", { class: "about2__sep", "aria-hidden": "true" }, "·"),
      el("span", { class: "about2__sig" }, "Discord @rvyyvn"),
    ),
  );
}

// --- actions ---------------------------------------------------------

function onAction(event) {
  const target = event.target.closest("[data-act]");
  if (!target) return;
  const act = target.getAttribute("data-act");

  switch (act) {
    case "edit-setup":
      onEditSetup();
      break;
    case "export-copy":
      exportToClipboard(target);
      break;
    case "export-file":
      exportToFile(target);
      break;
    case "import-pick":
      if (pending || importError) {
        pending = null;
        importError = null;
        render();
      } else {
        fileInput.click();
      }
      break;
    case "import-commit":
      commitImport();
      break;
    case "import-cancel":
      pending = null;
      importError = null;
      render();
      break;
    case "reset-open":
      confirming = !confirming;
      pending = null;
      importError = null;
      render();
      break;
    case "reset-commit":
      clearStorage();
      onReset();
      break;
    case "reset-cancel":
      confirming = false;
      render();
      break;
    default:
      break;
  }
}

function exportToClipboard(rowBtn) {
  const json = JSON.stringify(exportAll(), null, 2);
  navigator.clipboard?.writeText(json).then(
    () => flash(rowBtn.querySelector(".ack")),
    () => {
      /* clipboard blocked (insecure context, permissions) — the file path still works */
    },
  );
}

function exportToFile(subBtn) {
  const json = JSON.stringify(exportAll(), null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wgt-export-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  const label = subBtn.querySelector("span:last-child");
  const original = label.textContent;
  label.textContent = "Saved";
  setTimeout(() => {
    label.textContent = original;
  }, 2000);
}

function onFileChosen(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj;
    try {
      obj = JSON.parse(String(reader.result));
    } catch {
      pending = null;
      importError = "That file is not valid JSON.";
      render();
      return;
    }
    pending = { name: file.name, obj, counts: countRecords(obj) };
    importError = null;
    confirming = false;
    render();
  };
  reader.readAsText(file);
}

function commitImport() {
  if (!pending) return;
  try {
    importAll(pending.obj);
  } catch (err) {
    pending = null;
    importError = err.message;
    render();
    return;
  }
  pending = null;
  render();
}

/** Reveal a transient `.ack`, then hide it after two seconds. */
function flash(node) {
  if (!node) return;
  node.hidden = false;
  setTimeout(() => {
    node.hidden = true;
  }, 2000);
}
