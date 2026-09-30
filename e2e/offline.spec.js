import { expect, test } from "@playwright/test";
import { dismissWhatsNew, hasSeed, seedApp } from "./seed.js";

// Offline first: no CDN fonts, remote images or calls for diet data. Walk every
// tab and sheet-free screen, and fail on any request that leaves localhost.
// (The update check is the one allowed call; the reminder subscription needs
// VITE_PUSH_URL, which is unset in a dev build.)
// The documented outbound call: the update check in Settings and on load.
const UPDATE_CHECK = "https://api.github.com/repos/rvyyv-n/diet-tracker/releases/latest";

test.skip(!hasSeed, "dev-seed.html is missing");

test("no request leaves localhost", async ({ page }) => {
  const external = [];
  page.on("request", (req) => {
    const { protocol, hostname } = new URL(req.url());
    if (protocol.startsWith("http") && hostname !== "localhost" && hostname !== "127.0.0.1") {
      if (req.url() === UPDATE_CHECK) return;
      external.push(req.url());
    }
  });
  await seedApp(page);
  for (const tab of ["today", "plan", "weight", "recipes", "settings"]) {
    await page.goto(`/?tab=${tab}`);
    await dismissWhatsNew(page);
    await page.evaluate("document.fonts.ready");
    await page.waitForTimeout(300);
  }
  expect(external, "these requests leave the device").toEqual([]);
});

test("every bundled web font loads", async ({ page }) => {
  // local()-only faces (the licensed ones that are not vendored) are expected to
  // be absent, so judge the woff2 requests instead of document.fonts.
  const bad = [];
  let loaded = 0;
  page.on("response", (res) => {
    if (!/\.woff2(\?|$)/.test(res.url())) return;
    if (res.ok()) loaded += 1;
    else bad.push(`${res.status()} ${res.url()}`);
  });
  await seedApp(page, { look: "paper", theme: "light" });
  await page.goto("/?tab=today");
  await page.evaluate("document.fonts.ready");
  expect(bad).toEqual([]);
  expect(loaded, "at least one bundled font is requested").toBeGreaterThan(0);
});
