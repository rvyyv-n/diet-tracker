# Rise — Settings/About + consistency pass. Build spec.

Target: existing vanilla-JS app `diet-tracker`. No React, no build step.
Prototype reference: `Rise.dc.html` (3a = Today/Weight, 2a = Settings, 1a = first pass).

---

## 1. Token values (already in tokens.css — do not redefine)

```
--coral-500        #cc785c    --color-primary
--coral-700        #a9583e    --color-primary-active
--ink-900          #141413    --text-ink
--ink-700          #3d3d3a    --text-body
--ink-500          #6c6a64    --text-muted
--ink-400          #8e8b82    --text-muted-soft
--cream-50         #faf9f5    --surface-canvas
--cream-100        #f5f0e8    --surface-soft
--cream-200        #efe9de    --surface-card
--cream-250        #e6dfd8    --border-hairline
--cream-300        #e8e0d2    --surface-cream-strong
--night-900        #181715    --surface-dark
--night-fg         #faf9f5    --text-on-dark
--night-fg-soft    #a09d96    --text-on-dark-soft
--border-on-dark   #302d29
--red-500          #c64545    --status-error / --intake-low
--focus-ring       0 0 0 3px rgba(204,120,92,.15)

space  xxs 4 / xs 8 / sm 12 / md 16 / lg 24 / xl 32
radius sm 6 / md 8 (control) / lg 12 (card) / pill 9999
--touch-target 56px   --app-max-width 520px   --border-width-hairline 1px
--text-title-sm      500 16px/1.4  sans
--text-body-sm       400 14px/1.55 sans
--text-caption       500 13px/1.4  sans
--text-caption-upper 500 12px/1.4  sans, track 1.5px, uppercase
--text-code          400 14px/1.6  mono
--text-display-md    36px/1.15 serif, track -.5px   (screen titles)
--text-display-sm    28px/1.2  serif, track -.3px
```

Coral rule: never at rest on a control. Only on (a) the button that commits,
(b) the transient `.ack`, (c) About links on navy, (d) the active tab's 2px top border.
Red only on `.btn--danger` inside the open confirm panel.

---

## 2. Settings screen — wireframe

```
┌──────────────────────────────────────┐
│                                      │  .screen.settings2, gap 24
│  Settings                            │  h1 36px serif
│  Setup, data and about               │  13px muted
│                                      │
│  SETUP                               │  .group__label  12px upper, track 1.5
│  ┌────────────────────────────────┐  │  .card.set2-card  radius 12, pad 0
│  │ ✎  Edit setup              ›   │  │  56px row
│  └────────────────────────────────┘  │
│                                      │
│  DATA                                │
│  ┌────────────────────────────────┐  │
│  │ ⤓  Export data       [Copied]  │  │  tap = clipboard; ack coral 2s
│  │      ⤓ Download file           │  │  44px, indented 48px
│  ├────────────────────────────────┤  │  hairline #e6dfd8
│  │ ⤒  Import data   [Choose file] │  │  row is a div; button acts
│  │    Replaces what is here,      │  │  only sub-line on the screen
│  │    after a preview.            │  │
│  ├────────────────────────────────┤  │
│  │ ░ wgt-export-2026-08-24.json   │  │  .set-panel, --surface-soft
│  │ ░ 1 profile · 24 days · 4      │  │  mono stats
│  │ ░ Exported 24 Aug · schema v1  │  │
│  │ ░ Replacing overwrites …       │  │
│  │ ░ [Replace all data]  Cancel   │  │  coral primary + text btn
│  └────────────────────────────────┘  │
│  ──────────────────────────────────  │  hairline, full width
│  ↺  Reset all data                   │  plain ink row, 48px, no red
│  ┌────────────────────────────────┐  │
│  │ Erase everything?              │  │  .set-confirm, 1px #c64545
│  │ This removes your profile, 24  │  │
│  │ day records and 4 weigh-ins …  │  │
│  │ [Erase everything]  Cancel     │  │  .btn--danger = red fill
│  └────────────────────────────────┘  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  .about2  #181715, radius 12
│  ┃ Rise · v1.0.0                  ┃  │  mono 14
│  ┃ schema wgt v1                  ┃  │  mono 12, #a09d96
│  ┃                                ┃  │
│  ┃ Everything stays on this       ┃  │  14px #a09d96
│  ┃ device.                        ┃  │
│  ┃ No accounts, no network.       ┃  │
│  ┃                                ┃  │
│  ┃ Source on GitHub · Discord     ┃  │  coral links
│  ┃ @rvyyvn                        ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
├──────────────────────────────────────┤
│    ☑        ↗        ☰               │  54px, icon 20 above label 11
│  Today   Weight   Settings           │  active: ink + 2px coral top
└──────────────────────────────────────┘
```

---

## 3. Exact copy

```
Title            Settings
Subtitle         Setup, data and about
Group labels     SETUP · DATA            (uppercase via CSS; author sentence case)
Row 1            Edit setup
Row 2            Export data
Row 2 sub        Download file           → "Saved" for 2s
Row 2 ack        Copied
Row 3            Import data
Row 3 desc       Replaces what is here, after a preview.
Row 3 button     Choose file             → "Close" when open, "Imported" after
Row 4            Reset all data

Import panel
  title          wgt-export-2026-08-24.json
  stats          1 profile · 24 days · 4 weigh-ins
  meta           Exported 24 August 2026 · schema v1
  body           Replacing overwrites everything in this browser. Export first if you want to keep what is here.
  buttons        Replace all data | Cancel

Confirm panel
  title          Erase everything?
  body           This removes your profile, 24 day records and 4 weigh-ins from this browser, and starts the plan over at week 1. It cannot be undone.
  buttons        Erase everything | Cancel

About
  Rise · v1.0.0
  schema wgt v1
  Everything stays on this device.
  No accounts, no network.
  Source on GitHub · Discord @rvyyvn
```

Sentence case everywhere. No emoji. Counts interpolated from real data.

---

## 4. Lucide icon names (0.469)

Inline the SVG — do not load the CDN. All: `viewBox="0 0 24 24" fill="none"
stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`.

```
pencil               Edit setup row, Weight row-edit    20px / 16px, stroke 1.75
download             Export data row                    20px, stroke 1.75
arrow-down-to-line   Download file sub-action           15px, stroke 1.75
upload               Import data row                    20px, stroke 1.75
rotate-ccw           Reset all data row                 20px, stroke 1.75
chevron-right        Edit setup chevron                 16px, stroke 2
square-check-big     Today tab                          20px, stroke 1.75
trending-up          Weight tab                         20px, stroke 1.75
sliders-horizontal   Settings tab                       20px, stroke 1.75
check                Today checklist tick               14px, stroke 2.5
```

Stroke 1.75 not Lucide's default 2 — at 20px the default outweighs the 1px hairlines.
Icons render `--text-muted`; the label stays the loudest thing in the row.

Paths:
```
pencil              M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z   +   m15 5 4 4
download            M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4   +   m7 10 5 5 5-5   +   M12 15V3
upload              M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4   +   m17 8-5-5-5 5   +   M12 3v12
arrow-down-to-line  M12 17V3   +   m6 11 6 6 6-6   +   M19 21H5
rotate-ccw          M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8   +   M3 3v5h5
chevron-right       m9 18 6-6-6-6
square-check-big    M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11   +   m9 11 3 3L22 4
trending-up         M16 7h6v6   +   m22 7-8.5 8.5-5-5L2 17
sliders-horizontal  M21 4h-7 / M10 4H3 / M21 12h-9 / M8 12H3 / M21 20h-5 / M12 20H3 / M14 2v4 / M8 10v4 / M16 18v4
check               M20 6 9 17l-5-5
```

---

## 5. HTML structure — settings.js

```html
<section class="screen settings2">
  <div class="screen-head">
    <h1 class="screen__title screen__title--lg">Settings</h1>
    <p class="phase-banner">Setup, data and about</p>
  </div>

  <div class="group">
    <span class="group__label">Setup</span>
    <div class="card set2-card">
      <button class="set2-row" type="button" data-act="edit-setup">
        <span class="set2-row__icon" aria-hidden="true"><svg …pencil…></svg></span>
        <span class="set2-row__body">
          <span class="set2-row__name">Edit setup</span>
        </span>
        <span class="set2-row__chev" aria-hidden="true"><svg …chevron-right…></svg></span>
      </button>
    </div>
  </div>

  <div class="group">
    <span class="group__label">Data</span>
    <div class="card set2-card">

      <div class="set2-item">
        <button class="set2-row" type="button" data-act="export-copy">
          <span class="set2-row__icon" aria-hidden="true"><svg …download…></svg></span>
          <span class="set2-row__body">
            <span class="set2-row__name">Export data</span>
          </span>
          <span class="ack" hidden>Copied</span>
        </button>
        <button class="set2-sub" type="button" data-act="export-file">
          <span class="set2-sub__icon" aria-hidden="true"><svg …arrow-down-to-line…></svg></span>
          <span>Download file</span>
        </button>
      </div>

      <div class="set2-row set2-row--static">
        <span class="set2-row__icon" aria-hidden="true"><svg …upload…></svg></span>
        <span class="set2-row__body">
          <span class="set2-row__name">Import data</span>
          <span class="set2-row__desc">Replaces what is here, after a preview.</span>
        </span>
        <button class="btn btn--secondary btn--sm" type="button" data-act="import-pick">Choose file</button>
        <input type="file" accept="application/json,.json" hidden>
      </div>

      <!-- injected after a file is read -->
      <div class="set-panel">
        <p class="set-panel__title">wgt-export-2026-08-24.json</p>
        <p class="set-panel__stats">1 profile · 24 days · 4 weigh-ins</p>
        <p class="set-panel__meta">Exported 24 August 2026 · schema v1</p>
        <p class="set-panel__body">Replacing overwrites everything in this browser. Export first if you want to keep what is here.</p>
        <div class="set-panel__actions">
          <button class="btn btn--primary" type="button" data-act="import-commit">Replace all data</button>
          <button class="btn btn--text" type="button" data-act="import-cancel">Cancel</button>
        </div>
      </div>

    </div>
  </div>

  <div class="set2-danger">
    <button class="set2-row" type="button" data-act="reset-open">
      <span class="set2-row__icon" aria-hidden="true"><svg …rotate-ccw…></svg></span>
      <span class="set2-row__body">
        <span class="set2-row__name">Reset all data</span>
      </span>
    </button>
    <!-- injected on tap -->
    <div class="set-confirm">
      <p class="set-confirm__title">Erase everything?</p>
      <p class="set-confirm__body">This removes your profile, 24 day records and 4 weigh-ins from this browser, and starts the plan over at week 1. It cannot be undone.</p>
      <div class="set-confirm__actions">
        <button class="btn btn--danger" type="button" data-act="reset-commit">Erase everything</button>
        <button class="btn btn--text" type="button" data-act="reset-cancel">Cancel</button>
      </div>
    </div>
  </div>

  <div class="about2">
    <div class="about2__group">
      <p class="about2__name">Rise · v1.0.0</p>
      <p class="about2__schema">schema wgt v1</p>
    </div>
    <div class="about2__group">
      <p class="about2__line">Everything stays on this device.</p>
      <p class="about2__line">No accounts, no network.</p>
    </div>
    <p class="about2__links">
      <a class="about2__link" href="https://github.com/…">Source on GitHub</a>
      <span class="about2__sep" aria-hidden="true">·</span>
      <a class="about2__link" href="https://discord.com/users/…">Discord @rvyyvn</a>
    </p>
  </div>
</section>
```

Tab bar (replaces the existing `<nav class="tabbar">`):

```html
<nav class="tabbar tabbar--icons" aria-label="Sections">
  <button class="tabbar__btn is-active" type="button" data-tab="today">
    <span class="tabbar__icon" aria-hidden="true"><svg …square-check-big…></svg></span>
    <span class="tabbar__label">Today</span>
  </button>
  <!-- weight: trending-up · settings: sliders-horizontal -->
</nav>
```

Today checklist tick — replace the text `✓`:

```html
<span class="block-row__tick is-done">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5"></path>
  </svg>
</span>
```

Weight history — `.weight__row-wk` stays in the markup, hidden by CSS on read rows:

```html
<section class="screen weight weight--v2">
  …
  <div class="group">
    <span class="group__label">Trend</span>
    <div class="card weight__chart"> <!-- no .field__label inside --> </div>
  </div>
  <div class="group">
    <span class="group__label">History</span>
    <div class="card weight__history">
      <div class="weight__row">
        <span class="weight__row-wk">Week 4</span>
        <span class="weight__row-date">24 August 2026</span>
        <span class="weight__row-kg">62.2 kg</span>
        <span class="weight__row-delta">+0.3</span>
        <button class="weight__row-edit" type="button" aria-label="Edit the 24 August 2026 weigh-in">
          <svg …pencil 16px…></svg>
        </button>
      </div>
    </div>
  </div>
</section>
```

Weigh-in save, wrapped so the ack can sit beside it:

```html
<div class="weight__save">
  <button class="btn btn--primary" type="button">Save</button>
  <span class="ack" hidden>Saved</span>
</div>
```

---

## 6. CSS delta — append to app.css

Also supplied as `additions.css` in this folder, identical content.

```css
/* ============================================================================
   settings.css — the Settings / About screen (pass 4). Paste into app.css when
   you're happy; it only adds, and touches nothing already there.
   ----------------------------------------------------------------------------
   Same rules as the rest: press + focus states only, no hover, hairline
   borders, 12px card radius, coral only on the control that commits.
   ========================================================================== */

.settings { gap: var(--space-lg); }


/* ------------------------------------------------------------- groups ---
   An uppercase tracked label above a card, matching .field__label. Named for
   the job, not the screen — Weight uses it for Trend and History too.        */

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.group__label {
  font: var(--text-caption-upper);
  letter-spacing: var(--type-caption-upper-track);
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ---------------------------------------------------------------- ack ---
   A transient coral acknowledgement after a write — Copied, Saved, Imported.
   The one place coral appears at rest, and it leaves after two seconds.      */

.ack {
  flex: none;
  font: var(--text-caption);
  color: var(--color-primary);
}

/* .card, minus its padding, so rows run edge to edge. */
.set-card {
  padding: 0;
  overflow: hidden;
}


/* --------------------------------------------------------------- rows ---
   Flatter than .block-row: one card, hairline dividers, no per-row border.  */

.set-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: var(--transition-control);
}
.set-row + .set-row,
.set-panel + .set-row {
  border-top: var(--border-width-hairline) solid var(--border-hairline);
}
.set-row:active { background: var(--surface-cream-strong); }
.set-row:focus-visible { outline: none; box-shadow: var(--focus-ring); }

.set-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.set-row__name {
  font: var(--text-title-sm);
  color: var(--text-ink);
}

.set-row__desc {
  font: var(--text-body-sm);
  line-height: 1.35;
  color: var(--text-muted);
}

.set-row__chev {
  flex: none;
  font-size: 11px;
  color: var(--text-muted-soft);
}

/* transient acknowledgement — see .ack above */


/* -------------------------------------------------------------- panel ---
   The import preview. Recessed inside the card, like .rotation.             */

.set-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface-soft);
  border-top: var(--border-width-hairline) solid var(--border-hairline);
}

.set-panel__title {
  font: var(--text-title-sm);
  color: var(--text-ink);
}

.set-panel__stats {
  font: var(--text-code);
  color: var(--text-ink);
  font-variant-numeric: tabular-nums;
}

.set-panel__meta {
  font: var(--text-caption);
  color: var(--text-muted-soft);
}

.set-panel__body {
  font: var(--text-body-sm);
  color: var(--text-body);
}

.set-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-xxs);
}
.set-panel__actions .btn--text { padding-inline: var(--space-sm); }


/* ------------------------------------------------------------- danger ---
   Its own section below a full-width rule, so it can't be mistaken for one
   more data row. The button sits in ink; red appears only once the confirm
   panel is open.                                                            */

.set-danger {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  padding-top: var(--space-lg);
  border-top: var(--border-width-hairline) solid var(--border-hairline);
}

.set-confirm {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface-canvas);
  border: var(--border-width-hairline) solid var(--status-error);
  border-radius: var(--radius-card);
}

.set-confirm__title {
  font: var(--text-title-sm);
  color: var(--text-ink);
}

.set-confirm__body {
  font: var(--text-body-sm);
  color: var(--text-body);
}

.set-confirm__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-xxs);
}

/* APP LAYER — a destructive button variant. The system has no such thing, and
   --status-error already means "well under target" on Today, so red is kept off
   every resting control and used only here, on the button that erases. */
.btn--danger {
  background: var(--status-error);
  color: var(--text-on-primary);
}
.btn--danger:active { background: #a83a3a; }


/* -------------------------------------------------------------- about ---
   Quiet, at the very bottom, no card. Version is mono — it's a number.      */

.set-about {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
  margin-top: var(--space-sm);
}

.set-about__version {
  font: var(--text-code);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.set-about__line {
  font: var(--text-body-sm);
  color: var(--text-muted-soft);
}

.set-about__link {
  font: var(--text-body-sm);
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.set-about__link:active { color: var(--color-primary-active); }


/* ------------------------------------------------- header consistency ---
   Pass-4 item deferred from pass 3 ("title lengths across screens"). Every
   top-level screen now uses .screen-head: a 36px serif title with one small
   muted line under it. That makes the setup screen's 28px title + body-size
   intro the odd one out, so it adopts the same pair.                         */

.screen-head--setup .screen__title {
  font: var(--text-display-md);
  letter-spacing: var(--type-display-md-track);
}


/* ============================================================================
   settings-v2.css — Settings screen, second direction.
   ----------------------------------------------------------------------------
   Additive, like settings.css. Depends on tokens.css + app.css, and reuses
   .set-group / .set-panel / .set-confirm / .btn--danger from settings.css.

   What is new here:
     · icon-led list rows (Lucide 0.469 glyphs, inlined as SVG)
     · a collapsed Export row with a small secondary action beneath
     · an icon-above-label tab bar
     · a dark-navy About block, using the --surface-dark token the app already
       defines but has never used
   ========================================================================== */

.settings2 { gap: var(--space-lg); }


/* --------------------------------------------------------------- card ---
   Same shell as v1: .card with the padding removed so rows run edge to edge.
   One divider rule covers rows, stacked items and expanding panels alike.   */

.set2-card {
  padding: 0;
  overflow: hidden;
}
.set2-card > * + * {
  border-top: var(--border-width-hairline) solid var(--border-hairline);
}


/* ---------------------------------------------------------------- row ---
   Action name left behind a 20px glyph. Right side is either a chevron (it
   navigates) or a small secondary button (it acts) — never both.            */

.set2-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: var(--transition-control);
}
.set2-row:active { background: var(--surface-cream-strong); }
.set2-row:focus-visible { outline: none; box-shadow: var(--focus-ring); }

/* the Import row is a container, not the actuator — its button is */
.set2-row--static { cursor: default; }
.set2-row--static:active { background: transparent; }

.set2-row__icon {
  flex: none;
  display: flex;
  width: 20px;
  height: 20px;
  color: var(--text-muted);
}
.set2-row__icon svg { width: 100%; height: 100%; }

.set2-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.set2-row__name {
  font: var(--text-title-sm);
  color: var(--text-ink);
}

/* one muted line, only where a word is genuinely needed */
.set2-row__desc {
  font: var(--text-body-sm);
  line-height: 1.35;
  color: var(--text-muted);
}

.set2-row__chev {
  flex: none;
  display: flex;
  width: 16px;
  height: 16px;
  color: var(--text-muted-soft);
}
.set2-row__chev svg { width: 100%; height: 100%; }

/* row acknowledgement uses the shared .ack token (settings.css) */


/* --------------------------------------------------------- stacked item ---
   Export: the row itself copies; the file download sits under it as a small
   secondary action, indented to the name's left edge (16 pad + 20 icon + 12
   gap). Kept at 44px so it is still a real tap target.                      */

.set2-item {
  display: flex;
  flex-direction: column;
}

.set2-sub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  min-height: 44px;
  margin-left: calc(var(--space-md) + 32px);
  padding: 0 var(--space-xs) var(--space-xs) 0;
  font: var(--text-body-sm);
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: var(--transition-control);
}
.set2-sub span { text-decoration: underline; text-underline-offset: 3px; }
.set2-sub:active { color: var(--text-ink); }
.set2-sub:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-control); }

.set2-sub__icon { display: flex; width: 15px; height: 15px; }
.set2-sub__icon svg { width: 100%; height: 100%; }

/* small secondary button, for a row that acts */
.btn--sm {
  min-height: 44px;
  padding: 0 var(--space-sm);
  font: var(--text-caption);
}


/* ------------------------------------------------------------- danger ---
   A plain ink row under a divider — no red at rest. The confirm panel below
   it carries the only red on the screen.                                     */

.set2-danger {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: var(--border-width-hairline) solid var(--border-hairline);
}

.set2-danger .set2-row {
  padding-inline: 0;
  min-height: 48px;
}


/* -------------------------------------------------------------- about ---
   Dark navy, inset at the very bottom. The app has carried --surface-dark
   since the first pass without ever putting it on screen; this is the one
   place a utility screen can use it without turning into a marketing band.
   Sentence per line, no wrapped paragraphs. Mono for the version and the
   signature — both read as machine strings, not prose.                       */

.about2 {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-sm);
  padding: var(--space-lg) var(--space-md);
  background: var(--surface-dark);
  border-radius: var(--radius-card);
}

.about2__group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.about2__name {
  font: var(--text-code);
  color: var(--text-on-dark);
  font-variant-numeric: tabular-nums;
}

.about2__schema {
  font: var(--text-code);
  font-size: 12px;
  color: var(--text-on-dark-soft);
}

.about2__line {
  font: var(--text-body-sm);
  color: var(--text-on-dark-soft);
}

.about2__links {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font: var(--text-body-sm);
}

.about2__link {
  color: var(--color-primary);
  text-decoration: none;
  transition: var(--transition-control);
}
.about2__link:active { color: var(--color-primary-active); text-decoration: underline; text-underline-offset: 3px; }
.about2__link:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-sm); }

.about2__sep { color: var(--border-on-dark); }

.about2__sig {
  font: var(--text-code);
  font-size: 12px;
  color: var(--text-on-dark-soft);
}


/* ------------------------------------------------------------- tabbar ---
   Icon above label. Three tabs at 390px gave each one 130px and the labels
   crowded; stacking buys the width back and leaves room for a fourth.

   Height stays close to the 52px bar so the 64px .app-content clearance still
   holds — the stack fits by tightening the gap, not by growing the bar. The
   extra 2px of bottom padding offsets the 2px transparent border-top, which
   would otherwise sit the icon and label visibly low in the button.          */

.tabbar--icons .tabbar__btn {
  flex-direction: column;
  gap: 2px;
  min-height: 54px;
  padding: 4px 0 6px;
}

.tabbar__icon {
  display: flex;
  width: 20px;
  height: 20px;
}
.tabbar__icon svg { width: 100%; height: 100%; }

.tabbar--icons .tabbar__label { font-size: 11px; line-height: 1.2; }


/* ============================================================================
   today-weight.css — pass 5. What Today and Weight take from the Settings
   pass, so the three screens share one vocabulary.
   ----------------------------------------------------------------------------
   Additive, loaded after app.css. Every rule here overrides something in
   app.css; when you merge, edit the original instead and delete this file.
   Deletions it implies are marked DELETE.
   ========================================================================== */


/* ---------------------------------------------------------- suggestion ---
   Was a 3px coral left edge. So is .block-row--shake, which means the same
   mark carried two meanings — "the plan wants to change" and "you skip this
   one" — and the two can appear on the same screen. The shake keeps the edge
   (it is a property of one row); the suggestion becomes a recessed panel, the
   same treatment .rotation and .set-panel already use for "something opened
   here". Coral now only appears on its Apply button.
   DELETE app.css: .suggestion { border-left: 3px solid var(--color-primary) } */

.suggestion {
  padding: var(--space-md);
  background: var(--surface-soft);
  border: var(--border-width-hairline) solid var(--border-hairline);
  border-radius: var(--radius-card);
}


/* ---------------------------------------------------------------- tick ---
   The checklist tick was a text ✓, so its weight tracked the body font and
   drifted from every other glyph in the app. Now the Lucide check, from the
   same set as the Settings rows.                                             */

.block-row__tick svg {
  width: 14px;
  height: 14px;
}


/* -------------------------------------------------------------- weight ---
   "Trend" and "History" moved out of their cards and onto .group__label, so
   the history card is now a pure row container — the same shape as .set2-card,
   with dividers running the full card width instead of being inset by the
   card's own padding.
   DELETE app.css: the .field__label headings inside .weight__chart and
   .weight__history; .weight__row's padding-top and border-top-color.          */

/* Scoped to .weight--v2 so the 1a frame keeps app.css behaviour untouched.

   The week label is hidden on read rows: at 390px the five-column grid left the
   date track 58px and "24 August 2026" wrapped to three lines, making rows 92px
   tall. "Week 3" and "17 August 2026" carry the same fact, so the read rows keep
   the date and the edit row keeps the label. */

.weight--v2 .weight__history {
  padding: 0;
  gap: 0;
}

.weight--v2 .weight__row {
  grid-template-columns: 1fr auto auto auto;
  padding: var(--space-sm) var(--space-md);
  border-top-color: var(--border-hairline);
}
.weight--v2 .weight__row:first-of-type { border-top: none; }
.weight--v2 .weight__row:not(.weight__row--edit) .weight__row-wk { display: none; }

/* the inline edit row adopts .btn--sm rather than its own padding
   DELETE app.css: .weight__row--edit .btn { padding: 8px 12px } */
.weight--v2 .weight__row--edit .btn {
  min-height: 44px;
  padding: 0 var(--space-sm);
}

/* the weigh-in now acknowledges the write, like Export does */
.weight__save {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.weight__entry .weight__save .btn { align-self: auto; }
```

### Deletions from app.css

```
.suggestion { border-left: 3px solid var(--color-primary) }    → replaced above
.weight__row--edit .btn { padding: 8px 12px }                  → .btn--sm
.weight__row { padding-top: var(--space-xs) }                  → scoped rule above
.weight__row { border-top-color: var(--border-hairline-soft) } → --border-hairline
.today__footer + its rules                                     → Settings owns Edit setup
```

---

## 7. File-by-file change list

```
src/js/settings.js                NEW
  renderSettings(mount) — sections above; delegated click handler on data-act.
  edit-setup      → renderWelcome(mount, { edit: true })   (no summary step)
  export-copy     → navigator.clipboard.writeText(JSON.stringify(exportAll()))
                    then flash .ack "Copied" 2000ms
  export-file     → Blob + <a download="wgt-export-YYYY-MM-DD.json">, best-effort;
                    flash "Saved". iOS home-screen may block — clipboard is primary.
  import-pick     → hidden <input type="file"> .click()
                    on change: parse, count profile/days/weights, inject .set-panel
  import-commit   → replaces all keys, re-render
  import-cancel   → remove panel
  reset-open      → inject .set-confirm (toggle; closes the import panel)
  reset-commit    → storage.clear(), route to first-run
  reset-cancel    → remove panel
  VERSION         → one module constant, read by .about2__name

src/js/app.js
  add "settings" route + third tab button
  tab bar: <nav class="tabbar tabbar--icons">, icon+label spans (§5)

src/js/today.js
  delete footer() and its call        — Settings owns "Edit setup"
  tick: text ✓ → inline Lucide check  (§5)
  suggestion: unchanged markup, restyled by CSS

src/js/weight.js
  section root gets class weight--v2
  "Trend"/"History": .field__label inside card → .group__label in a .group above
  history card: .card.weight__history wraps rows only
  row pencil: hand-drawn 16px SVG → Lucide pencil, stroke 1.75
  Save: wrap in .weight__save, flash .ack "Saved" after a write
  inline edit row buttons: add btn--sm

src/css/app.css
  append §6, apply the deletion list

src/css/tokens.css
  no change
```

## 8. Open

- Import trusts the file's `schemaVersion`. Decide what a v2 export dropped on a v1 build says.
- Coral on `--surface-dark` measures ~4.6:1 — fine for the two About links, not for body copy on dark.
- Suggestion copy in the prototype is placeholder; `adjust.js` was not read.
- Reset routes to first-run. Confirm that is the intent rather than an empty Today.
