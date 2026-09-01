/**
 * intro.js — the first-run splash.
 *
 * A short branded card shown once, ahead of the welcome form (app.js routes it
 * on `!profile.introSeen`). It fades through to the welcome screen; under
 * `prefers-reduced-motion` the card still shows but the fade doesn't run.
 *
 * It can always be got past: a tap anywhere dismisses it, there's an explicit
 * Skip button, and a hard cap (HOLD_MS) dismisses it on its own. An intro that
 * can't be skipped is worse than no intro.
 */

import { el } from "./ui/dom.js";

const HOLD_MS = 3500; // hard cap on how long the splash holds the screen
const FADE_MS = 240; // must match .intro--out in app.css

export function renderIntro(mount, { onDone }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let done = false;
  let holdTimer;

  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(holdTimer);
    if (reduced) {
      onDone();
      return;
    }
    screen.classList.add("intro--out");
    setTimeout(onDone, FADE_MS);
  };

  const screen = el(
    "div",
    { class: "intro" + (reduced ? "" : " intro--in"), onclick: finish },
    el(
      "div",
      { class: "intro__card" },
      el("div", { class: "intro__mark", "aria-hidden": "true" }, "Rise"),
      el(
        "p",
        { class: "intro__line" },
        "Your daily plan for steady, sustainable weight gain.",
      ),
      el(
        "button",
        { class: "btn btn--text intro__skip", type: "button", onclick: finish },
        "Get started",
      ),
    ),
  );

  mount.replaceChildren(screen);
  holdTimer = setTimeout(finish, HOLD_MS);
}
