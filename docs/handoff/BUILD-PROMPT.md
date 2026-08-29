# Pass 4 build prompt

Paste the block below into Claude Code on the PC after `git pull`.

---

Build the Settings/About screen + consistency pass from docs/handoff/SPEC.md.
Read that file and docs/roadmap.md first. Sonnet, high effort — this is
execution against a settled spec, don't re-derive it.

Order:

0. Token reconcile. Diff SPEC.md §1's token list against src/css/tokens.css.
   Add every missing one with the value the spec gives (likely absent:
   --surface-dark, --text-on-dark, --text-on-dark-soft, --border-on-dark,
   --text-title-sm, --text-caption-upper, --type-caption-upper-track,
   --text-on-primary, --transition-control, --type-display-md-track, the
   --radius-* names). If the spec's name for an existing token differs from
   ours, use ours and note it.

1. Trim docs/handoff/additions.css to the v2 selectors only before merging:
   keep .group/.group__label, .ack, .set-panel, .set-confirm, .btn--danger,
   .screen-head--setup, the whole settings-v2 block, the today-weight block.
   Drop the v1-only selectors (.set-row, .set-card, .set-about, .set-danger).

2. Build in testable slices:
   a. src/js/core/backup.js — new. exportAll() -> {profile, days, weights};
      importAll(obj) writes the three wgt:* keys. Keeps settings.js view-only.
   b. src/js/settings.js — new. renderSettings(mount) + one delegated data-act
      handler. Action map is in SPEC.md §7.
   c. src/js/app.js — add the "settings" route + third tab; swap .tabbar markup
      for the icon-above-label version (SPEC.md §5).
   d. src/js/today.js — delete footer() and its call; swap the text tick for
      the inline Lucide check.
   e. src/js/weight.js — weight--v2 on the section; "Trend"/"History" become
      .group__label above the card; Lucide pencil; .weight__save wrapper with a
      "Saved" ack; btn--sm on the inline edit row.
   f. Append the trimmed CSS to src/css/app.css; apply the SPEC.md §6 deletion
      list.

3. Resolve the SPEC.md §8 open questions:
   - Import: refuse if the file's schemaVersion > SCHEMA_VERSION, message
     "This backup is from a newer version." Otherwise importAll + re-render.
   - Reset: storage.clear() then route to first-run. That's intended.
   - Ignore the spec's placeholder suggestion copy — adjust.js already returns
     headline/detail.
   - App name: keep "Diet Tracker". Use it in the About block, not "Rise".

4. Serve over http, click through Today / Weight / Settings at a ~390px
   viewport. Confirm the weight history rows no longer wrap to three lines,
   the import preview and reset confirm panels open/close, export copies to
   clipboard, and the dark About block renders.

Commit in segmented commits where it makes sense (tokens, backup+settings,
app/tabbar, today, weight, css). Plain messages, me as sole author, no Claude
or AI attribution of any kind. Prefix commits with TZ=UTC.

Then update docs/roadmap.md: move pass 4 to done, and git rm docs/handoff/ in
the final commit.
