// Dev helper: an interaction check. It finds what a code read can't: hover
// washes with square corners, controls with no focus change, text clipped by a
// parent, panels that leave the screen, labels that don't line up with the
// text in their field, and popovers that ignore Escape.
//
// It measures computed style and position, takes no screenshot, and prints
// only the failures, so it costs little to read. Exit code 1 if any.
//
//   node scripts/interact.mjs
//   node scripts/interact.mjs '{"scenes":["today","log-food"],"looks":["reel"],"widths":[390]}'
//
// Keys (all optional): scenes (names below), looks, themes, widths. Hover is
// only checked at 900px and wider, as touch has no hover. Like shot.mjs it
// seeds the demo history, pins the clock and turns reduced motion on.
//
// INTERACT_CSS='<css>' injects a rule into every screen, to prove the check
// catches a bug you put back (e.g. '.r-option{border-radius:0!important}').
// BASE=http://127.0.0.1:5199 is the dev server (npm run dev -- --port 5199).
// CHROMIUM=/path/to/chrome overrides the browser; otherwise installed Chrome.
import { chromium } from "@playwright/test";

const plan = JSON.parse(process.argv[2] ?? "{}");
const base = process.env.BASE ?? "http://127.0.0.1:5199";
const CLOCK = plan.clock ?? "2026-09-30T15:00:00";
const looks = plan.looks ?? ["paper", "reel"];
const themes = plan.themes ?? ["light", "dark"];
const widths = plan.widths ?? [390, 1280];
const TAB_STOPS = 40; // Tab presses per scene
const HOVERS = 40; // hovered controls per scene

// A scene is a screen, plus clicks that open something on it. `closes` is a
// selector that Escape must remove, hide or close.
const SCENES = [
  { name: "today", tab: "today" },
  { name: "plan", tab: "plan" },
  { name: "weight", tab: "weight" },
  { name: "recipes", tab: "recipes" },
  { name: "settings", tab: "settings" },
  { name: "edit-profile", tab: "settings", steps: [".r-setprofile"] },
  { name: "log-food", tab: "today", steps: ["text=+ Log food"], closes: ".r-sheet__panel" },
  {
    name: "log-food-listbox",
    tab: "today",
    steps: ["text=+ Log food", "text=Foods", ".r-sheet__panel .lb__trigger"],
    closes: ".lb__panel:not([hidden])",
  },
  { name: "add-block", tab: "today", steps: ["text=+ Add a block"], closes: ".r-sheet__panel" },
].filter((s) => !plan.scenes || plan.scenes.includes(s.name));

const INTERACTIVE =
  'button, a[href], input, select, textarea, [role="radio"], [role="option"], [role="tab"], [tabindex="0"]';

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { channel: "chrome" },
);
const found = new Map(); // "scene | problem" -> variants that hit it
const note = (variant, scene, problem) => {
  const key = `${scene} | ${problem}`;
  found.set(key, [...(found.get(key) ?? []), variant]);
};

// Runs in the page. Returns problems that need no input: clipping, overflow,
// panels off screen, and label / hint alignment.
function audit(INTERACTIVE) {
  const out = [];
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const name = (el) =>
    el.tagName.toLowerCase() +
    (el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "") +
    (el.textContent.trim() ? ` "${el.textContent.trim().slice(0, 24)}"` : "");

  if (document.documentElement.scrollWidth > innerWidth + 1)
    out.push(
      `the page scrolls sideways (${document.documentElement.scrollWidth}px in ${innerWidth}px)`,
    );

  // Controls cut off by a parent that hides its overflow.
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!vis(el) || el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowX !== "hidden" && o.overflowY !== "hidden" && o.overflow !== "clip") continue;
      const pr = p.getBoundingClientRect();
      const cut = Math.max(
        pr.left - r.left,
        r.right - pr.right,
        pr.top - r.top,
        r.bottom - pr.bottom,
      );
      if (cut > 1) {
        out.push(`${name(el)} is cut off by ${name(p)} (${Math.round(cut)}px)`);
        break;
      }
    }
  }

  // Text that doesn't fit its box and shows no ellipsis.
  for (const el of document.querySelectorAll("span, p, button, label, h1, h2, h3, a")) {
    if (!vis(el) || el.children.length || !el.textContent.trim()) continue;
    const s = getComputedStyle(el);
    if (s.overflowX === "visible" || s.textOverflow === "ellipsis" || el.closest(".sr-only"))
      continue;
    if (el.scrollWidth > el.clientWidth + 1)
      out.push(`text is clipped in ${name(el)} (${el.scrollWidth}px in ${el.clientWidth}px)`);
  }

  // An open panel must sit inside the window.
  for (const el of document.querySelectorAll(
    ".lb__panel:not([hidden]), .cal__panel:not([hidden]), .r-sheet__panel",
  )) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1)
      out.push(`${name(el)} leaves the window`);
  }

  // A field's label and hint start where its typed text starts.
  const textLeft = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().left;
  };
  for (const f of document.querySelectorAll(".r-field")) {
    const box = f.querySelector(".r-field__box");
    const input = box?.querySelector("input");
    if (!vis(f) || !input) continue;
    const want = input.getBoundingClientRect().left;
    for (const part of f.querySelectorAll(".r-field__label, .r-field__note")) {
      if (Math.abs(textLeft(part) - want) > 1.5)
        out.push(`${name(part)} starts ${Math.round(textLeft(part) - want)}px from the typed text`);
    }
  }
  return out;
}

// Runs in the page. Accessibility problems that need no input: controls with
// no name, touch targets under 24px (WCAG 2.2 AA, counting a grown ::after hit area), text under 4.5:1
// (3:1 for large text), and motion that ignores reduced-motion.
function a11y(INTERACTIVE) {
  const out = [];
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const name = (el) =>
    el.tagName.toLowerCase() +
    (el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "") +
    (el.textContent.trim() ? ` "${el.textContent.trim().slice(0, 24)}"` : "");

  // Controls need an accessible name.
  for (const el of document.querySelectorAll(`${INTERACTIVE}, [role="slider"]`)) {
    if (!vis(el) || el.closest("[hidden], [inert], [aria-hidden='true']")) continue;
    const labelled =
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.textContent.trim() ||
      el.getAttribute("title") ||
      el.labels?.length ||
      el.querySelector("img[alt]:not([alt=''])");
    if (!labelled) out.push(`${name(el)} has no accessible name`);
  }

  // Touch target size: the control's own box, or its wrapping label for a field.
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!vis(el) || el.closest("[hidden], [inert]") || el.type === "hidden") continue;
    // A text link inside a sentence is exempt (WCAG 2.5.8).
    if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
    const r = el.getBoundingClientRect();
    // Many controls grow their hit area with an ::after box (--target-min).
    const pseudo = getComputedStyle(el, "::after");
    const grown = pseudo.content !== "none" && pseudo.position === "absolute";
    const w = Math.max(r.width, grown ? parseFloat(pseudo.width) || 0 : 0);
    const h = Math.max(r.height, grown ? parseFloat(pseudo.height) || 0 : 0);
    if (Math.min(w, h) < 24)
      out.push(`${name(el)} is a small target (${Math.round(w)}x${Math.round(h)}px)`);
  }

  // Contrast: text colour against the nearest opaque background behind it.
  const parse = (c) => {
    const m = c.match(/[\d.]+/g)?.map(Number);
    return m ? { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 } : null;
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const behind = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      // A gradient or image behind the text can't be measured here.
      if (s.backgroundImage !== "none") return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) layers.push(c);
      if (c && c.a === 1) break;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    if (layers.length && layers.at(-1).a < 1) base = { r: 255, g: 255, b: 255, a: 1 };
    for (const l of layers.reverse()) base = over(l, base);
    return base;
  };
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el) || el.closest("[hidden], [aria-hidden='true'], .sr-only")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const s = getComputedStyle(el);
    if (Number(s.opacity) < 1) continue;
    const fg = parse(s.color);
    const bg = behind(el);
    if (!fg || !bg) continue;
    const text = over(fg, bg);
    const [a, b] = [lum(text), lum(bg)];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(s.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const key = `${name(el)} ${ratio.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`low contrast ${ratio.toFixed(1)}:1 (needs ${need}) in ${name(el)}`);
    }
  }

  // Reduced motion: with the preference on, nothing may animate for long.
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    const secs = (v) => Math.max(...v.split(",").map((x) => parseFloat(x) || 0));
    if (
      s.animationName !== "none" &&
      secs(s.animationDuration) > 0.011 &&
      s.animationIterationCount === "infinite"
    )
      out.push(`${name(el)} loops an animation under reduced motion`);
    else if (
      secs(s.transitionDuration) > 0.011 ||
      (s.animationName !== "none" && secs(s.animationDuration) > 0.011)
    )
      out.push(`${name(el)} still moves under reduced motion (${s.transitionDuration})`);
  }
  return out;
}

// Runs in the page. Indexes the controls so Node can find them again.
function mark(INTERACTIVE) {
  let n = 0;
  const list = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inView = r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
    if (!inView || s.visibility === "hidden" || el.disabled || el.closest("[hidden], [inert]"))
      continue;
    // Skip what an open sheet or panel covers.
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top !== el && !el.contains(top) && !top?.contains(el)) continue;
    el.dataset.ix = String(n++);
    list.push(el.dataset.ix);
  }
  return list;
}

// Runs in the page. What a control looks like, on itself and on the wrappers
// that draw a ring for it (a text field's box, a select, a listbox).
function look(ix) {
  const el = document.querySelector(`[data-ix="${ix}"]`);
  if (!el) return null;
  const one = (e) => {
    const s = getComputedStyle(e);
    return [s.backgroundColor, s.boxShadow, s.outlineStyle, s.outlineWidth, s.borderColor].join(
      "|",
    );
  };
  // The ring may sit on the control, a child (a dot, a frame) or a wrapper up to three levels out.
  const wraps = [];
  for (let p = el.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) wraps.push(one(p));
  return {
    self: [el, ...[...el.querySelectorAll("*")].slice(0, 8)].map(one).join("#"),
    wrap: wraps.join("#"),
    radius: getComputedStyle(el).borderRadius,
    // a row's wash is a gradient over its colour (--r-wash), so read both
    bg: getComputedStyle(el).backgroundColor + getComputedStyle(el).backgroundImage,
    label: el.textContent.trim().slice(0, 24) || el.getAttribute("aria-label") || el.tagName,
    tag: el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : ""),
    parentRadius: getComputedStyle(el.parentElement).borderRadius,
    edge: (() => {
      const r = el.getBoundingClientRect();
      const p = el.parentElement.getBoundingClientRect();
      return Math.min(r.left - p.left, p.right - r.right);
    })(),
  };
}

const square = (r) => r === "0px" || r === "";

for (const look_ of looks) {
  for (const theme of themes) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: theme === "dark" ? "dark" : "light",
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    let variant = "";
    page.on("pageerror", (e) => note(variant, "any", `pageerror: ${e.message}`));
    await page.clock.setFixedTime(new Date(CLOCK));
    await page.goto(base + "/dev-seed.html");
    await page.locator("#seed").click();
    await page.waitForTimeout(900);
    await page.evaluate(
      ([t, l]) => {
        const p = JSON.parse(localStorage.getItem("wgt:profile"));
        p.themePref = t;
        p.lookPref = l;
        localStorage.setItem("wgt:profile", JSON.stringify(p));
      },
      [theme, look_],
    );

    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 900 ? 800 : 844 });
      variant = `${look_}/${theme}/${width}`;
      for (const scene of SCENES) {
        const here = (problem) => note(variant, scene.name, problem);
        await page.goto(`${base}/?tab=${scene.tab}`);
        await page.evaluate("document.fonts.ready");
        await page.waitForTimeout(300);
        // INTERACT_CSS injects a rule, to prove the check catches a bug you put back.
        if (process.env.INTERACT_CSS) await page.addStyleTag({ content: process.env.INTERACT_CSS });
        const got = page.getByRole("button", { name: "Got it" });
        if (await got.count()) {
          await got.first().click();
          await got.first().waitFor({ state: "detached" });
        }
        let opened = true;
        for (const step of scene.steps ?? []) {
          try {
            await page.locator(step).first().click({ timeout: 3000 });
            await page.waitForTimeout(250);
          } catch {
            here(`could not open: "${step}" was not clickable`);
            opened = false;
            break;
          }
        }
        if (!opened) continue;

        for (const problem of await page.evaluate(audit, INTERACTIVE)) here(problem);
        for (const problem of await page.evaluate(a11y, INTERACTIVE)) here(`a11y: ${problem}`);

        // Focus: Tab through, and each stop must look different once focused.
        await page.evaluate(() => document.activeElement?.blur());
        const ids = await page.evaluate(mark, INTERACTIVE);
        const before = {};
        for (const ix of ids) before[ix] = await page.evaluate(look, ix);
        await page.evaluate(() => document.activeElement?.blur());
        const seen = new Set();
        for (let i = 0; i < Math.min(TAB_STOPS, ids.length + 2); i++) {
          await page.keyboard.press("Tab");
          await page.waitForTimeout(200); // let a ring transition finish
          const ix = await page.evaluate(() => document.activeElement?.dataset?.ix ?? null);
          if (ix === null || seen.has(ix)) continue;
          seen.add(ix);
          // An open trigger already wears the focus ring, so focus adds nothing.
          if (await page.evaluate(() => document.activeElement?.ariaExpanded === "true")) continue;
          const now = await page.evaluate(look, ix);
          const was = before[ix];
          if (now && was && now.self === was.self && now.wrap === was.wrap)
            here(`${was.tag} "${was.label}" shows no change when focused`);
        }

        // Hover (mouse widths only): a wash must be rounded and inside its parent.
        if (width >= 900) {
          await page.evaluate(() => document.activeElement?.blur());
          for (const ix of ids.slice(0, HOVERS)) {
            const was = before[ix];
            const box = await page.locator(`[data-ix="${ix}"]`).boundingBox();
            if (!box || !was) continue;
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(60);
            const now = await page.evaluate(look, ix);
            if (!now || now.bg === was.bg) continue;
            if (square(now.radius))
              here(`${now.tag} "${now.label}" has a hover wash with square corners`);
            else if (!square(now.parentRadius) && now.edge < 1)
              here(`${now.tag} "${now.label}" has a hover wash that touches its rounded parent`);
          }
          await page.mouse.move(0, 0);
        }

        // The Today sun slider answers the arrow keys, Home and Escape.
        if (scene.name === "today") {
          const sun = page.locator('[role="slider"]');
          if (!(await sun.count())) here("a11y: the Today sun slider is missing");
          else {
            const val = () => sun.getAttribute("aria-valuenow");
            await sun.focus();
            const end = await val();
            await page.keyboard.press("ArrowLeft");
            const back = await val();
            if (back === end) here("a11y: ArrowLeft does not move the sun slider");
            await page.keyboard.press("Home");
            if ((await val()) !== "0") here("a11y: Home does not move the sun slider to the start");
            if (!(await sun.getAttribute("aria-valuetext")))
              here("a11y: the sun slider has no value text");
            await page.keyboard.press("Escape");
            await page.evaluate(() => document.activeElement?.blur());
          }
        }

        // Escape closes what this scene opened.
        if (scene.closes) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(250);
          const left = await page.evaluate(
            (sel) =>
              [...document.querySelectorAll(sel)].some((e) => e.getBoundingClientRect().height > 0),
            scene.closes,
          );
          if (left) here(`Escape does not close ${scene.closes}`);
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();

if (!found.size) {
  console.log("interaction check: no problems");
} else {
  const all = looks.length * themes.length * widths.length;
  for (const [key, variants] of found) {
    const where = variants.length === all ? "every variant" : [...new Set(variants)].join(", ");
    console.log(`${key}  (${where})`);
  }
  console.log(`\n${found.size} problem${found.size === 1 ? "" : "s"}`);
  process.exitCode = 1;
}
