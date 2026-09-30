/**
 * useWide.js — whether the desktop layout is showing (the side nav's
 * breakpoint), so a screen can open its sheets as 520px dialogs. Pass 67,
 * shared from pass 68.
 */

import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 1024px)";

function subscribe(cb) {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useWide() {
  return useSyncExternalStore(subscribe, () => matchMedia(WIDE).matches);
}
