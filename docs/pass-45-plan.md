# pass 45 — the framework call: migration plan

Decided in `roadmap.md`: full adopt, React + Vite, so reactbits.dev components
(background/ambient, interactive/hover, and text/number effects) can be used
close to as-authored. This doc is the planning pass that decision called for —
dependency choices, migration order, and how the two vanilla-era primitives
map onto React — written before any screen is rewritten.

## Tooling decisions

- **npm**, not pnpm or bun. It ships with Node and needs no extra install; no
  existing signal in this repo prefers anything else.
- **JavaScript + JSX, not TypeScript.** The whole codebase is untyped today;
  adding types is a second migration stacked on the framework one, and it can
  be layered in later per-file (`.jsx` → `.tsx`) if ever wanted. Not now.
- **Vite**, `@vitejs/plugin-react`. Plain `React.createElement` was considered
  and rejected — reactbits.dev ships components as JSX source, and hand-
  desugaring every one defeats "close to as-authored."
- **reactbits.dev is copy-paste, not an npm package** (same model as
  shadcn/ui) — there is nothing to `npm install` for the components
  themselves. Each chosen component's source is copied into
  `src/components/reactbits/`, and whatever it depends on (`framer-motion`,
  `gsap`, etc.) is added as a real npm dependency at the point a component
  that needs it is copied in — not speculatively up front.

## What moves, what doesn't

- **`src/js/core/*.js` is untouched.** It's pure data/logic — localStorage
  reads/writes, plan math, adjustment engine — with no DOM in it. It gets
  imported into React components exactly as it's imported into vanilla ones
  today.
- **`src/js/ui/*.js` and every screen module** (`app.js`, `today.js`,
  `plan-view.js`, `weight.js`, `settings.js`, `welcome.js`, `intro.js`) are the
  render layer and get rewritten as React components. They're deleted once
  their replacement ships, not kept alongside it.
- **Static assets** (`manifest.json`, `sw.js`, `assets/`) move into a
  `public/` directory, Vite's convention for files copied to the build output
  verbatim with no processing.

## Primitive → React idiom

- **`justOpened(key, isOpen)`** (pass 41c) exists because the vanilla render
  model rebuilds a subtree on every re-render, so a CSS entrance animation
  needs an explicit "did this genuinely just open" gate. React's model doesn't
  have that problem the same way — a component that stays mounted across
  re-renders naturally only runs its mount effect once. The equivalent is a
  `useEffect(() => {...}, [])` on mount for the entrance class, no gating Set
  needed. Verify per-surface during migration rather than assume.
- **`renderPreservingFocus()`** exists to survive `replaceChildren()` blowing
  away focus on every re-render. React's reconciler keeps the same DOM node
  for an element in the same position across renders, so most call sites need
  nothing at all. Keep it (or a thin equivalent) only where a list reorders
  and a keyed re-render would still lose focus — check each such surface
  (Recipes list, grocery checklist) specifically rather than porting the
  helper wholesale.

## Native shells

Both currently copy the raw source tree verbatim on every build — there is no
build step to skip today:

- `android/app/build.gradle.kts`'s `copyWebAssets` task copies
  `index.html`, `manifest.json`, `sw.js`, `src/**`, `assets/**` into
  `app/src/main/assets`.
- `desktop/scripts/sync-desktop-assets.sh` copies the same set into
  `desktop/dist`.

Once Vite owns the build, both switch to copying the **Vite build output**
(`dist/` at repo root) instead, with `npm run build` run first. This is a
required change, not optional cleanup — the raw `src/` tree stops being
servable once screens are JSX.

## sw.js precaching

`PRECACHE_URLS` is hand-maintained today because file names are stable. A Vite
production build emits hashed chunk filenames, so the list has to come from
somewhere generated rather than be typed by hand at every release. Deferred
until the first production build exists to look at — likely either read
Vite's build manifest at service-worker-generation time, or bring in
`vite-plugin-pwa` and let it own precaching outright. Not decided yet;
revisit once `npm run build` output is real.

## Migration order

**Shell first, screens one at a time, behind a per-screen adapter** — not a
big-bang rewrite, and not screens-before-shell either:

1. **The shell (`app.js`) converts first.** React owns `#app` and the router,
   but every screen it mounts still runs through a thin adapter component
   that mounts the *existing* vanilla `render()`/`repaint()` functions into a
   ref'd div — so behaviour doesn't change yet, only who owns the root.
2. **Screens convert one at a time**, easiest first: **Settings** (mostly
   toggles, smallest surface) → **Weight** → **Plan** → **Today** (most
   complex — the block checklist, the day-total bar, the entry animations —
   done last once the idioms are proven) → **Welcome/Intro** (the setup
   flow, touched least often).
3. Each screen's conversion deletes its slice of `ui/dom.js` reliance as it
   goes; `ui/dom.js` itself is deleted once nothing imports it.
4. reactbits.dev effects layer in **as** a screen converts, not after: the
   hero kcal figure gets a count-up (text/number effects) when Today
   converts, hover affordances land when a screen's interactive controls
   convert, ambient/background effects go wherever they read well once the
   surface is real.

This keeps the app in a working, shippable state after every single step —
the adapter means a screen not yet converted keeps working exactly as it does
today, so the migration can pause between any two screens without breaking
the app.
