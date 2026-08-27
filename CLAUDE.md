# CLAUDE.md — Weight-Gain Tracking App

## 0. How to start this session

**Do not write code yet.** Read this file, then work through §1 before anything else.

The plan content is settled and does not need re-deriving — it lives in
`docs/plan-spec.md`. Read that file when you need the actual numbers, not before.
What is *not* settled is whether an app is the right shape for this at all.

Ground rules:

- **Ask before building.** Where this is ambiguous, ask rather than assume. Batch
  your questions — one round of 3–6 beats six separate exchanges.
- **Push back.** If something here is a bad idea, say so. The author would rather
  hear it now than after it's built. Blunt disagreement is welcome and useful.
- **Watch the budget.** See §6. State the rough cost of a plan before executing it.
- **Scope hard.** A working daily checklist plus a weight log is genuinely useful.
  A half-finished app with six screens is not.
- **Explain the reasoning.** The user is learning to code and prefers understanding
  concepts over being handed finished files.

## Reference files (read on demand, not at launch)

| File | Contains |
|---|---|
| `docs/plan-spec.md` | Blocks, phases, rotations, food database, adjustment rules, grocery list |
| `docs/design-system.md` | Full colour/type tokens, and what's still missing for UI |
| `weight-gain-plan.docx` | The plan of record — recipes, prose, appetite tactics. **Ask the user for this if it isn't present.** |
| `diet-tracker.xlsx` | Existing spreadsheet. Weak structure, good UI patterns. |

---

## 1. First task — validate the premise

Before designing anything, assess honestly: **does this justify an app?**

The plan is 7 fixed meal blocks and one weight reading per week. That is a small
amount of data, and a spreadsheet already does it. An app has to earn its
existence over that spreadsheet.

Argue it either way, but argue it. Then:

**If an app makes sense** → state its actual job in one sentence, propose the
minimum build that does that job, and wait for approval before coding.

**If it doesn't** → say so plainly and propose branch-off directions that would
justify the effort. Starting points, not a menu — generate your own:

- A general **block-based eating tracker** — "fixed blocks, not calorie logging"
  generalised past this one plan. The insight: adherence tracking beats nutrition
  logging for people who won't log.
- A **plan-runner** — ingest any structured diet plan (a doc, a coach's PDF) and
  generate the tracker and adjustment engine from it.
- A **trend engine** for anything with noisy daily data and slow real signal —
  weight, mood, training load. The rolling-average-plus-suggestion loop is the
  reusable part.
- A **hardgainer tool** where appetite, not willpower, is the bottleneck —
  liquid-calorie prompting, appetite-window timing, fullness logging.

For each: what it is, who it's for, why it beats a spreadsheet, rough build size.

---

## 2. The target user

The app is built for a profile, not a person. Real figures are entered on first
run and stored locally; nothing personal is committed to this repository.

- Underweight, wanting to gain — height, weight and age come from the profile
- Untrained, **possibly no gym access** — the plan absorbs this via block A3
- Goal: sustainable gain at **0.25–0.4 kg/week**, over several months
- Home cooking, limited time and equipment, low budget
- Meals partly family-cooked, partly self-cooked
- **Dislikes calorie logging.** This is the central design constraint, not a
  preference. Any design requiring per-food logging has failed.
- Prefers visual, structured output over prose.

Anything the app computes from — height, weight, birth date, target rate — is
runtime state in `src/js/core/profile.js`, never a literal in the source.

---

## 3. ✅ Resolved — source-of-truth conflict

The two source files contradict each other.

| | `weight-gain-plan.docx` | `diet-tracker.xlsx` |
|---|---|---|
| Structure | 7 blocks (B1–B4 core, A1–A3 add-ons) | 4 fixed meals |
| Daily target | 2,565 / 3,110 / 3,690 by phase | flat 2,975 |
| Phases | 3 | none |
| Span | 91 dated days | 7 undated days |
| Weight | weekly, drives adjustments | one column, feeds nothing |

**Recommended:** build on the **document's 7-block / 3-phase model**. It's the only
one that can execute the adjustment rules, which need four weeks of weight history
and phase transitions. Take the *interface* ideas from the tracker — checkboxes,
grocery list, status colours — since those are what the user responded to.

**RESOLVED (2026-08-27).** The user chose the document's model: it is more
comprehensive, and the spreadsheet is the thing this app replaces. Build on the
7-block / 3-phase structure in `docs/plan-spec.md`. Keep the spreadsheet's
*interface* ideas — checkboxes, grocery list, status colours — and discard the
rest of the file. Do not reopen this.

---

## 4. Requirements

```yaml
must_have:
  - daily checklist of ACTIVE blocks as the primary screen; tap to complete
  - running daily kcal + protein derived from completed blocks
  - weekly weight entry — one number
  - 4-week rolling average + weekly adherence %
  - adjustment rules evaluated automatically, SUGGESTED not applied
  - rotation picker for lunch/dinner that updates totals
  - grocery checklist, resettable weekly
  - status colour on the daily total (note the inversion in the design file)

nice_to_have:
  - one-off food entry from the food database for off-plan meals
  - weight chart with trend line, daily noise de-emphasised
  - appetite/fullness note per day — appetite is the real bottleneck

out_of_scope:
  - barcode scanning
  - social feeds, streaks, gamification
  - macro breakdowns beyond kcal and protein
  - accounts, cloud sync, ads

principles:
  - local-first storage, single user
  - never nag or shame on a missed block — show the number and move on
  - the app should reduce decisions, not add them
```

**Open questions — raise these, propose a default:**

- Platform: web / PWA / native / desktop?
- Stack? The user is learning backend — a build that teaches something may be
  worth more than the fastest path. Ask rather than defaulting.
- Does this need a backend at all, or is local storage enough?
- What happens on a missed day — backfill, or let it go?
- Should the app own the plan data, or import it from the document?

---

## 5. Design

Full tokens in `docs/design-system.md`. Read it before building any UI.

Summary: warm and editorial. Cream canvas `#FAF9F5`, not white. Newsreader for
headings, Inter for body/UI, JetBrains Mono for numbers. Coral `#CC785C` as the
single accent, used sparingly. Hairline borders, generous spacing.

**The tokens cover print documents, not interfaces.** Before building UI, ask the
user to supply the missing pieces from their Claude Design system — the list is at
the end of `docs/design-system.md`.

---

## 6. Token and budget discipline

The user works against a usage limit and has been burned by an expensive session.

- **State the cost before you spend it.** Before a multi-file build, estimate its
  size and offer a smaller version.
- **Don't re-read files you've already read.** Don't dump large files into context
  to check something you already know.
- **Don't render or screenshot repeatedly** to verify visual output. Check once.
- **Batch questions** into single rounds.
- If the session runs long, say so and suggest a clean break point.
- **Opus for judgment and decisions; Sonnet for execution against a settled spec.**
  Say so when a handoff makes sense.

---

## 7. Settled decisions — don't re-litigate

- Target rate is **0.25–0.4 kg/week**, not 0.5. Faster is mostly fat with no
  training stimulus to direct it.
- **No commercial mass gainers.** Homemade shakes are ~2–3× cheaper per calorie.
- Rotation IDs are **L1–L3 and D1–D3**, deliberately renamed to avoid colliding
  with block IDs A1–A3 / B1–B4. Don't undo this.
- Gym content was deliberately removed from the document. Training is absorbed by
  enabling block A3 on training days. Don't rebuild around it until access is real.
- Maintenance estimate (~2,400 kcal) is a **calculation, not a measurement**.
  Hardgainers often run higher. The scale corrects the estimate, not the reverse —
  the app should treat the target as a hypothesis under revision.

---

## 8. Suggested opening move

1. Read this file. Ask for `weight-gain-plan.docx` if it isn't present.
2. Do §1 — decide whether an app is warranted; if not, propose branch-offs.
3. Batch your questions: the §3 conflict, the §4 open questions, and the missing
   design tokens.
4. Propose a minimum build with a rough cost estimate. Wait for approval.
5. Only then write code.
