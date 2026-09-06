/**
 * Intro.jsx — the first-run splash, converted from intro.js.
 *
 * A short branded card shown once, ahead of the welcome form (App.jsx routes
 * here on `!profile.introSeen`). It fades through to the welcome screen;
 * under `prefers-reduced-motion` the card still shows but the fade doesn't
 * run.
 *
 * It can always be got past: a tap anywhere dismisses it, there's an
 * explicit Skip button, and a hard cap (HOLD_MS) dismisses it on its own. An
 * intro that can't be skipped is worse than no intro. `doneRef` guards
 * against firing `onDone` twice — a tap right as the hold timer fires,
 * or a tap on the button that then bubbles to the card's own handler.
 */

import { useEffect, useRef, useState } from "react";

const HOLD_MS = 3500; // hard cap on how long the splash holds the screen
const FADE_MS = 240; // must match .intro--out in app.css

export default function Intro({ onDone }) {
  const reducedRef = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const doneRef = useRef(false);
  const [exiting, setExiting] = useState(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    if (reducedRef.current) {
      onDone();
      return;
    }
    setExiting(true);
    setTimeout(onDone, FADE_MS);
  }

  useEffect(() => {
    const holdTimer = setTimeout(finish, HOLD_MS);
    return () => clearTimeout(holdTimer);
    // finish reads only refs and the (stable-for-this-mount) onDone prop, so
    // it's safe to omit from deps rather than recreate the timer on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={"intro" + (reducedRef.current ? "" : " intro--in") + (exiting ? " intro--out" : "")}
      onClick={finish}
    >
      <div className="intro__card">
        <div className="intro__mark" aria-hidden="true">Rise</div>
        <p className="intro__line">Your daily plan for steady, sustainable weight gain.</p>
        <button className="btn btn--text intro__skip" type="button" onClick={finish}>
          Get started
        </button>
      </div>
    </div>
  );
}
