/**
 * broadcast.js — the "another screen may now be stale" signal.
 *
 * Until pass 33 exactly one screen was ever on display, so repainting after a
 * write was enough: every other screen was rebuilt from storage the next time
 * it was opened. The wide layout shows several screens at once, and then a
 * block ticked on Today leaves Weight's adherence readout and Plan's phase
 * targets visibly wrong on the same display. Nothing about that is a CSS
 * problem, which is why it lands here rather than in the layout pass.
 *
 * Each screen publishes its own id at the end of its `render()`; app.js
 * subscribes and repaints the other mounted panes. Publishing on *render*
 * rather than on each write is deliberate — it is one line per screen with no
 * list of write sites to keep in step, and today.js alone commits from a dozen
 * places. The cost is the occasional repaint no data change warranted, which
 * is cheap and never renders anything wrong.
 *
 * Two rules keep it from looping. Publishes are coalesced into one microtask,
 * so a burst collapses to a single pass; and a publish raised *while* the queue
 * drains is dropped, which is what stops the ping-pong — a sibling's repaint
 * runs its own `render()`, which publishes in turn, which would otherwise
 * bounce straight back to the pane that started it.
 */

const listeners = new Set();

// Ids that have already repainted themselves in this tick, awaiting a flush,
// or null when nothing is queued.
let pending = null;
let flushing = false;

/** Listen for the signal. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Announce that `origin` has just repainted from fresh data. Subscribers are
 * handed the set of ids that are already current, so they can skip them —
 * repainting the pane that raised the signal would be pure waste, and on a
 * phone (one pane) that would mean rendering twice on every tap.
 */
export function publish(origin) {
  if (flushing) return;
  if (pending) {
    pending.add(origin);
    return;
  }
  pending = new Set([origin]);
  queueMicrotask(flush);
}

function flush() {
  const fresh = pending;
  pending = null;
  flushing = true;
  try {
    listeners.forEach((fn) => fn(fresh));
  } finally {
    flushing = false;
  }
}
