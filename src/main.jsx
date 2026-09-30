/**
 * Vite/React entry point (pass 45). Replaces src/js/app.js as the script
 * index.html loads. The Look and theme are set before first paint by
 * index.html's inline script and kept by core/theme.js, which has to start
 * before React mounts anything; persistence/update checks are still
 * fire-and-forget side effects with no UI of their own, so none of the three
 * belong inside App's render.
 */

import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initTheme } from "./js/core/theme.js";
import { requestPersistence } from "./js/core/persist.js";
import { autoCheckForUpdate } from "./js/core/updates.js";
import { initReminders } from "./js/core/reminders.js";

// Re-apply the stored Look and theme (index.html already set them pre-paint)
// and start following the OS while the theme pref is "system".
initTheme();

createRoot(document.getElementById("app")).render(<App />);

// Ask the OS to mark our storage durable so it isn't evicted under pressure.
// Fire-and-forget: idempotent, best-effort, and never blocks the first render.
requestPersistence();

// Check GitHub for a newer release, at most once every 7 days. Fire-and-forget,
// silent on failure, and off the first-render path — same shape as above.
autoCheckForUpdate();

// Keep the service worker's copy of today's plan, and the reminder server's
// schedule, in step with every write. A no-op unless reminders can run here.
initReminders();
