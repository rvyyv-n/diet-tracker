import { expect, test } from "@playwright/test";
import { dismissWhatsNew, hasSeed, seedApp } from "./seed.js";

// Each case opens a screen on the seeded history and compares it with its
// approved picture in e2e/snapshots. A deliberate change: npm run test:visual:update.
//
// Both Looks since the picker landed (pass 70). Reel has no approved pictures
// yet: the sweep (pass 74) takes them with test:visual:update.
const LOOKS = ["paper", "reel"];
const THEMES = ["light", "dark"];
const SCREENS = ["today", "plan", "weight", "recipes", "settings"];
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const NARROW = { width: 320, height: 640 };

const cases = [
  ...LOOKS.flatMap((look) =>
    THEMES.flatMap((theme) => [
      ...SCREENS.map((screen) => ({ look, theme, screen, size: PHONE, tag: "phone" })),
      ...SCREENS.map((screen) => ({ look, theme, screen, size: DESKTOP, tag: "desktop" })),
    ]),
  ),
  // The 320 stress test: nothing clips on the screens that carry the most.
  ...["today", "weight", "plan"].map((screen) => ({
    look: LOOKS[0],
    theme: "light",
    screen,
    size: NARROW,
    tag: "narrow",
  })),
];

test.skip(!hasSeed, "dev-seed.html is missing");

for (const c of cases) {
  const name = `${c.tag}-${c.look}-${c.theme}-${c.screen}`;
  test(name, async ({ page }) => {
    await page.setViewportSize(c.size);
    await seedApp(page, c);
    await page.goto(`/?tab=${c.screen}`);
    await dismissWhatsNew(page);
    // Web fonts swap in mid-shot otherwise, and the day total counts up.
    await page.evaluate("document.fonts.ready");
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
