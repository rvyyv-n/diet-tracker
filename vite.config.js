import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
  plugins: [react()],
});
