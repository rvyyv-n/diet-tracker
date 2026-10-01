import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The service worker's cache name is a hash of what the build ships, so it
// changes exactly when a precached file does and nobody bumps it by hand.
// public/sw.js holds the placeholder `__BUILD__`; this fills it in on the
// copy in dist/. index.html is in the hash because it names the hashed
// bundles and is served cache-first. Every other file is hashed by content,
// in a fixed order. Dev serves the raw file, placeholder and all, which is a
// valid cache name.
function swCacheName() {
  const files = (dir) =>
    readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
  return {
    name: "sw-cache-name",
    apply: "build",
    closeBundle() {
      const out = "dist";
      const hash = createHash("sha256");
      for (const f of files(out)) {
        const name = relative(out, f).split(sep).join("/");
        if (name !== "sw.js") hash.update(name).update(readFileSync(f));
      }
      const sw = join(out, "sw.js");
      writeFileSync(
        sw,
        readFileSync(sw, "utf8").replace("__BUILD__", hash.digest("hex").slice(0, 10)),
      );
    },
  };
}

// manifest.json, sw.js and assets/ live in public/ and are copied to the
// build output root untouched — see the note beside their <link>/<script>
// tags in index.html for why those references are root-absolute.
export default defineConfig({
  // Every emitted URL is relative to the document, not the domain root. This
  // has to be "./" rather than the default "/" or a hardcoded "/diet-tracker/",
  // because the same build is served from three different roots: GitHub Pages
  // puts it under the project subpath (/diet-tracker/), while Android's
  // WebViewAssetLoader and the Tauri webview both serve it from "/". A root
  // base 404s every asset on Pages — index.html asks the domain root for a
  // bundle that only exists under the subpath, so nothing loads at all — and a
  // hardcoded subpath would break the two native shells the same way. Relative
  // is safe here because routing is by ?tab= query param, so every URL the app
  // is ever served at sits at the same directory depth.
  base: "./",
  plugins: [react(), swCacheName()],
  // `npm test` (pass 57). The core modules are DOM-free by design, so plain
  // node plus an in-memory localStorage (test/setup.js) is all they need.
  test: {
    environment: "node",
    setupFiles: ["./test/setup.js"],
    restoreMocks: true,
    // e2e/ belongs to Playwright.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
