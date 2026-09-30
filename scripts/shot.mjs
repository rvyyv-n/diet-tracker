// Dev helper: screenshot the running app with Playwright.
//
// It seeds four weeks of demo data first (dev-seed.html, untracked, so it has to
// exist), pins the clock, and turns reduced motion on. One JSON argument:
//
//   node scripts/shot.mjs '{"path":"/?tab=weight","width":390,"height":844,"look":"reel","theme":"dark","out":"shots/x.png"}'
//
// "grid" takes one shot per combination and saves them as one labelled image;
// the last key runs across and the others down. Keys are look, theme, width,
// height or tab:
//
//   node scripts/shot.mjs '{"path":"/?tab=today","grid":{"look":["paper","reel"],"theme":["light","dark"]},"cell":420,"out":"shots/grid.jpg"}'
//
// Other keys: "actions" (click / type / press / goto / eval / wait), "full" for
// the whole page, "text" to print the page text, "scale" for device pixel ratio.
// `look` sets profile.lookPref, which the app reads from the Look work onward;
// before that it is stored and ignored.
//
// BASE=http://127.0.0.1:5199 is the dev server (npm run dev -- --port 5199).
// CHROMIUM=/path/to/chrome overrides the browser; otherwise installed Chrome.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const plan = JSON.parse(process.argv[2] ?? "{}");
const base = process.env.BASE ?? "http://127.0.0.1:5199";
const url = base + (plan.path ?? "/");
// A fixed afternoon, so greetings, "today" and the seed never drift.
const CLOCK = plan.clock ?? "2026-09-30T15:00:00";

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { channel: "chrome" },
);
const ctx = await browser.newContext({
  viewport: { width: plan.width ?? 390, height: plan.height ?? 844 },
  deviceScaleFactor: plan.scale ?? 1,
  colorScheme: plan.theme === "dark" ? "dark" : "light",
  reducedMotion: "reduce",
});
const page = await ctx.newPage();
const logs = [];
let label = "";
const log = (line) => logs.push(label ? `[${label}] ${line}` : line);
page.on(
  "console",
  (m) => (m.type() === "error" || m.type() === "warning") && log(`${m.type()}: ${m.text()}`),
);
page.on("pageerror", (e) => log(`pageerror: ${e.message}`));
await page.clock.setFixedTime(new Date(CLOCK));

// Write the demo history into localStorage, once per run.
async function seed() {
  await page.goto(base + "/dev-seed.html");
  await page.locator("#seed").click();
  await page.waitForURL(/index\.html|\/$|\?/, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
}

// Every combination of the grid's values, e.g. {theme:[light,dark],look:[a,b]} gives 4.
const combos = (grid) =>
  Object.entries(grid).reduce(
    (acc, [key, values]) => acc.flatMap((c) => values.map((v) => ({ ...c, [key]: v }))),
    [{}],
  );

async function capture(variant) {
  const {
    theme = plan.theme ?? "light",
    look = plan.look ?? "paper",
    width = plan.width ?? 390,
    height,
    tab,
  } = variant;
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.setViewportSize({ width, height: height ?? plan.height ?? 844 });
  // Pin the Look and theme on the stored profile, then load the screen fresh.
  await page.evaluate(
    ([t, l]) => {
      const raw = localStorage.getItem("wgt:profile");
      if (!raw) return;
      const profile = JSON.parse(raw);
      profile.themePref = t;
      profile.lookPref = l;
      localStorage.setItem("wgt:profile", JSON.stringify(profile));
    },
    [theme, look],
  );
  const target = tab ? `${base}/?tab=${tab}` : url;
  await page.goto(target);
  await page.evaluate("document.fonts.ready");
  await page.waitForTimeout(400);
  // The "What's new" card covers the top of Today; dismiss it unless asked not to.
  if (plan.whatsNew !== true) {
    const got = page.getByRole("button", { name: "Got it" });
    if (await got.count()) await got.first().click();
  }
  for (const a of plan.actions ?? []) {
    if (a.click) await page.locator(a.click).first().click();
    if (a.type) await page.locator(a.type[0]).first().fill(a.type[1]);
    if (a.press) await page.keyboard.press(a.press);
    if (a.goto) await page.goto(base + a.goto);
    if (a.eval) log("eval: " + JSON.stringify(await page.evaluate(a.eval)));
    await page.waitForTimeout(a.wait ?? 300);
  }
}

if (plan.out) mkdirSync(dirname(plan.out), { recursive: true });
await seed();

if (plan.grid) {
  const keys = Object.keys(plan.grid);
  const shots = [];
  for (const variant of combos(plan.grid)) {
    label = keys.map((k) => variant[k]).join(" · ");
    await capture(variant);
    shots.push({
      label,
      png: (await page.screenshot({ fullPage: plan.full ?? false })).toString("base64"),
    });
  }
  label = "";
  const columns = plan.grid[keys.at(-1)].length;
  const cell = plan.cell ?? 420;
  const cells = shots
    .map(
      (s) =>
        `<figure><figcaption>${s.label}</figcaption><img src="data:image/png;base64,${s.png}" style="height:${cell}px"></figure>`,
    )
    .join("");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent(
    `<style>body{margin:0;background:#ddd;font:600 14px system-ui}main{display:grid;grid-template-columns:repeat(${columns},max-content);gap:16px;padding:16px;width:max-content}figure{margin:0}figcaption{margin-bottom:4px}img{display:block;box-shadow:0 0 0 1px #999}</style><main>${cells}</main>`,
  );
  const size = await page.evaluate(() => ({
    width: document.body.scrollWidth,
    height: document.body.scrollHeight,
  }));
  await page.setViewportSize(size);
  if (plan.out)
    await page.screenshot({
      path: plan.out,
      fullPage: true,
      ...(/\.jpe?g$/.test(plan.out) ? { quality: 80 } : {}),
    });
} else {
  await capture({});
  if (plan.out) await page.screenshot({ path: plan.out, fullPage: plan.full ?? false });
}
if (plan.out) console.log("saved", plan.out);
if (plan.text && !plan.grid) console.log((await page.locator("body").innerText()).slice(0, 3000));
if (logs.length) console.log(logs.join("\n"));
await browser.close();
