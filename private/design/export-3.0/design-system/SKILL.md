---
name: rise-design
description: Use this skill to generate well-branded interfaces and assets for Rise (a calm, warm, editorial diet planner and tracker), either for production or throwaway prototypes/mocks. Contains design guidelines, tokens (Paper and Reel Looks, light/dark), fonts, icons, React components and phone/desktop UI kits.
user-invocable: true
---

Read `readme.md` first (content rules, visual foundations, iconography), then `guidelines/product-rules.md` (behaviour rules that are not design decisions) and `guidelines/porting-to-code.md` (how to build these screens in the real React 19 + Vite + plain-CSS app).

- Link `styles.css` and set `data-look="paper|reel"` and `data-theme="light|dark"` on `<html>`. Components read semantic tokens only — never hard-code a colour or add Look-specific markup.
- Components live in `components/{core,tracking,surfaces}`: each `.jsx` has a `.d.ts` props contract and `.prompt.md` usage. `ui_kits/rise/` shows them composed into Today, Plan, Weight and Settings.
- Copy assets (fonts, `assets/icons`) out for static mocks; for production code, port tokens and components into the app's `src/css` and follow the rules in the guidelines.
- If invoked with no other guidance, ask what to build (screen, state, Look), then act as an expert designer outputting HTML artifacts or production code as needed.
