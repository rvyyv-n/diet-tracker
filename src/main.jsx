/**
 * Vite/React entry point (pass 45). Replaces src/js/app.js as the script
 * index.html loads. Theme pinning still has to happen before React mounts
 * anything (it sets a class/attribute index.html's own inline pre-paint script
 * doesn't cover — see core/theme.js), and persistence/update checks are still
 * fire-and-forget side effects with no UI of their own, so none of the three
 * belong inside App's render.
 */

import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initTheme } from "./js/core/theme.js";
import { requestPersistence } from "./js/core/persist.js";
import { autoCheckForUpdate } from "./js/core/updates.js";

// Re-apply the stored theme (index.html already set it pre-paint for a pinned
// choice) and start following the OS while the pref is "system".
initTheme();

createRoot(document.getElementById("app")).render(<App />);

// Ask the OS to mark our storage durable so it isn't evicted under pressure.
// Fire-and-forget: idempotent, best-effort, and never blocks the first render.
requestPersistence();

// Check GitHub for a newer release, at most once every 7 days. Fire-and-forget,
// silent on failure, and off the first-render path — same shape as above.
autoCheckForUpdate();
