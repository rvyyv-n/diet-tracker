# Product rules (not design decisions)

From `design-overhaul-brief.md` §4 and the screens' README. Design and code within these.

- **Never nag.** A missed block is a number. No streaks, badges, praise, "you're behind", red overdue. Insight copy states facts.
- **Intake colour is inverted** (gain plan): green = at/above target, gold = partial, red = well under. Nothing on Weight is red. Never use green for anything else near intake — Toggle "on" is ink, not green.
- **Colour is never the only signal:** a word sits beside every status dot and phase label.
- **Past days are closed.** Today + yesterday editable; older = view only ("This day is closed."). No ‹ date › stepper on Today; use the 7-day DotStrip + calendar sheet.
- **Due-now is emphasis only.** Earlier unticked blocks recede in tone and size (never red) and stay tappable.
- **Suggestions never apply themselves.** Always Apply + Not now. Phase 3 is only offered from Weight.
- **Shake** carries "Most skipped" while upcoming.
- **Toasts with Undo:** tick, weigh-in save, grocery Clear. Recipe delete keeps its two-step confirm.
- **Empty states:** weight history and recipe book only — one glyph, one line.
- **Offline first.** No CDN fonts, remote images or icon fonts. Everything self-hostable.
- **Text-labelled actions;** icon-only buttons need an accessible name. No swipe-only actions.
- **Out of scope:** streak count, mark-all-done, free-text notes, CSV export, recipe photos, online food lookup, a second desktop pane.
- **Hover** only under `(hover:hover) and (pointer:fine)`, one step below pressed; nothing moves on hover. **Body copy ≥4.5:1**: text-on-canvas uses `--accent-text`, not `--accent`.

## Motion reference (Bookcook site)
ease-out `cubic-bezier(.16,1,.3,1)` for almost everything; ease-in-out `cubic-bezier(.65,0,.35,1)` for the theme cross-fade (0.9s); spring/bounce `linear()` curves for arrivals and completion pops (scale from .6). Rise's daily interactions stay 150–350ms; theatrical patterns only for intro, first run, What's new. Engineering adds motion after layout; describe it, don't depend on it.
