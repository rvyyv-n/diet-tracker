import fs from "node:fs";

// The demo history comes from dev-seed.html, which is untracked (it is shared
// by hand). Specs skip with a clear message when it isn't there.
export const hasSeed = fs.existsSync("dev-seed.html");

/** A fixed afternoon, so greetings, "today" and the seeded history never drift. */
export const CLOCK = new Date("2026-09-30T15:00:00");

/** Pin the clock, write the seed into localStorage, and pick a Look and theme. */
export async function seedApp(page, { look = "paper", theme = "light" } = {}) {
  await page.clock.setFixedTime(CLOCK);
  await page.emulateMedia({ colorScheme: theme });
  await page.goto("/dev-seed.html");
  await page.locator("#seed").click();
  await page.waitForURL(/index\.html/);
  await page.evaluate(
    ([t, l]) => {
      const profile = JSON.parse(localStorage.getItem("wgt:profile"));
      profile.themePref = t;
      profile.lookPref = l;
      localStorage.setItem("wgt:profile", JSON.stringify(profile));
    },
    [theme, look],
  );
}

/** Dismiss the "What's new" card if it is showing. */
export async function dismissWhatsNew(page) {
  const got = page.getByRole("button", { name: "Got it" });
  if (await got.count()) await got.first().click();
}
