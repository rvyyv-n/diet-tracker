import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// manifest.json, sw.js and assets/ live in public/ and are copied to the
// build output root untouched — see the note beside their <link>/<script>
// tags in index.html for why those references are root-absolute.
export default defineConfig({
  plugins: [react()],
});
