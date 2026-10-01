// Dev helper: retake the README pictures in docs/screenshots.
//
//   node scripts/readme-shots.mjs            all five
//   node scripts/readme-shots.mjs hero today the ones you name
//
// It seeds the demo data (dev-seed.html), pins the clock, shoots each screen at
// 2x, then sets the shots inside a phone or window frame on a second page and
// saves that. The picture names are the ones README.md uses: hero.jpg,
// today.png, weight.png, plan.png and looks.png.
//
// BASE=http://127.0.0.1:5199 is the dev server (npm run dev -- --port 5199).
// CHROMIUM=/path/to/chrome overrides the browser; otherwise installed Chrome.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.BASE ?? "http://127.0.0.1:5199";
const OUT = "docs/screenshots";
const CLOCK = "2026-09-30T15:00:00";
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const BEZEL = 11;

// Every picture: what to shoot, and how to lay the shots out.
const PICTURES = {
  today: {
    file: "today.png",
    size: [534, 988],
    layers: [{ at: [61, 72], phone: { tab: "today", look: "paper", theme: "light" } }],
  },
  weight: {
    file: "weight.png",
    size: [534, 988],
    layers: [{ at: [61, 72], phone: { tab: "weight", look: "reel", theme: "dark" } }],
  },
  plan: {
    file: "plan.png",
    size: [900, 1100],
    layers: [
      { at: [60, 38], phone: { tab: "plan", look: "paper", theme: "dark" } },
      { at: [420, 151], phone: { tab: "recipes", look: "paper", theme: "light" } },
    ],
  },
  looks: {
    file: "looks.png",
    size: [900, 1100],
    layers: [
      { at: [60, 38], phone: { tab: "settings", look: "reel", theme: "dark" } },
      { at: [420, 151], phone: { tab: "today", look: "paper", theme: "light" } },
    ],
  },
  hero: {
    file: "hero.jpg",
    size: [1720, 1180],
    background:
      "radial-gradient(900px 600px at 100% 0%, #f2c3a4 0%, rgba(242,195,164,0) 70%), #f8f1e8",
    layers: [
      { at: [69, 90], window: { tab: "today", look: "paper", theme: "light" } },
      { at: [1247, 251], phone: { tab: "today", look: "reel", theme: "dark" } },
    ],
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(PICTURES);
for (const n of names) if (!PICTURES[n]) throw new Error(`unknown picture: ${n}`);

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { channel: "chrome" },
);
const ctx = await browser.newContext({
  viewport: PHONE,
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const app = await ctx.newPage();
const logs = [];
app.on("console", (m) => m.type() === "error" && logs.push(`console: ${m.text()}`));
app.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await app.clock.setFixedTime(new Date(CLOCK));

await app.goto(base + "/dev-seed.html");
await app.locator("#seed").click();
await app.waitForURL(/index\.html|\/$|\?/, { timeout: 5000 }).catch(() => {});
await app.waitForTimeout(900);

// One screen as a base64 PNG, with the Look and theme pinned on the profile.
const shots = new Map();
async function shoot({ tab, look, theme }, viewport) {
  const key = JSON.stringify([tab, look, theme, viewport.width]);
  if (shots.has(key)) return shots.get(key);
  await app.emulateMedia({ colorScheme: theme });
  await app.setViewportSize(viewport);
  await app.evaluate(
    ([t, l]) => {
      const profile = JSON.parse(localStorage.getItem("wgt:profile"));
      profile.themePref = t;
      profile.lookPref = l;
      localStorage.setItem("wgt:profile", JSON.stringify(profile));
    },
    [theme, look],
  );
  await app.goto(`${base}/?tab=${tab}`);
  await app.evaluate("document.fonts.ready");
  await app.waitForTimeout(400);
  const got = app.getByRole("button", { name: "Got it" });
  if (await got.count()) {
    await got.first().click();
    await got.first().waitFor({ state: "detached" });
  }
  const png = (await app.screenshot()).toString("base64");
  shots.set(key, png);
  return png;
}

const CSS = `
  html,body{margin:0}
  body{position:relative;overflow:hidden}
  .l{position:absolute}
  .phone{background:#161616;border-radius:56px;padding:${BEZEL}px;box-shadow:0 0 0 2px #2c2c2c inset,0 30px 60px rgba(0,0,0,.35)}
  .phone img{display:block;border-radius:46px;width:${PHONE.width}px;height:${PHONE.height}px}
  .win{background:#ece3d7;border-radius:24px;overflow:hidden;box-shadow:0 30px 70px rgba(80,40,10,.25)}
  .bar{height:44px;display:flex;align-items:center;gap:8px;padding-left:20px}
  .bar i{width:12px;height:12px;border-radius:50%;background:#d9cfc2}
  .bar i:first-child{background:#e2603a}
  .win img{display:block;width:${DESKTOP.width}px;height:${DESKTOP.height}px}
`;

mkdirSync(OUT, { recursive: true });
for (const name of names) {
  const pic = PICTURES[name];
  let html = "";
  for (const layer of pic.layers) {
    const [x, y] = layer.at;
    if (layer.phone) {
      const png = await shoot(layer.phone, PHONE);
      html += `<div class="l phone" style="left:${x}px;top:${y}px"><img src="data:image/png;base64,${png}"></div>`;
    } else {
      const png = await shoot(layer.window, DESKTOP);
      html += `<div class="l win" style="left:${x}px;top:${y}px"><div class="bar"><i></i><i></i><i></i></div><img src="data:image/png;base64,${png}"></div>`;
    }
  }
  const [w, h] = pic.size;
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<style>${CSS}body{width:${w}px;height:${h}px;background:${pic.background ?? "transparent"}}</style>${html}`,
  );
  const jpg = pic.file.endsWith(".jpg");
  await page.screenshot({
    path: `${OUT}/${pic.file}`,
    omitBackground: !jpg,
    ...(jpg ? { type: "jpeg", quality: 88 } : {}),
  });
  await page.close();
  console.log("saved", `${OUT}/${pic.file}`);
}
if (logs.length) console.log([...new Set(logs)].join("\n"));
await browser.close();
