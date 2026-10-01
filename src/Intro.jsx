/**
 * Intro.jsx — the first-run splash, from the first-run design frames.
 *
 * Shown once, ahead of Step 1 (App.jsx routes here on `!profile.introSeen`).
 * The "Rıse" wordmark with the sun as its dot, a horizon line, one line of
 * copy and a hero "Get started". A tap anywhere also continues, at any
 * moment; the button is the explicit control. It never advances on its own.
 *
 * The frames describe a 1.4 s entrance (the horizon, the letters, the sun
 * rising and settling into the ı, then the copy and the button). That is the
 * `motion` pass (76); this file is the finished layout it will animate.
 */

import { Button, Wordmark } from "./components/core.jsx";

export default function Intro({ onDone }) {
  return (
    <div className="r-intro" onClick={onDone}>
      <main className="r-intro__main">
        <h1 className="r-intro__mark" aria-label="Rise">
          <Wordmark variant="reel" size={88} />
        </h1>
        <div className="r-intro__horizon" aria-hidden="true" />
        <p className="r-intro__line">A daily plan for gaining weight at a steady pace.</p>
      </main>
      <div className="r-intro__cta">
        <Button
          variant="hero"
          fullWidth
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
        >
          Get started
        </Button>
      </div>
    </div>
  );
}
