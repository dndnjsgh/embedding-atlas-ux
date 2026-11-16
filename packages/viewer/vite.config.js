import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

import { tsJsonSchemaPlugin } from "./scripts/vite-plugin-ts-json-schema.js";

const sourcePath = (path) => fileURLToPath(new URL(path, import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  base: "",
  plugins: [svelte(), wasm(), icons({ compiler: "svelte" }), tsJsonSchemaPlugin()],
  worker: {
    format: "es",
    plugins: () => [wasm()],
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 4096,
  },
  resolve: {
    alias: [
      // The dashboard test route consumes the in-repo component source, so it
      // can run without a prior component package build.
      { find: "@embedding-atlas/component/svelte", replacement: sourcePath("../component/svelte/index.js") },
      { find: "@embedding-atlas/component", replacement: sourcePath("../component/src/lib/index.ts") },
    ],
  },
  optimizeDeps: {
    exclude: ["svelte"],
  },
  ssr: {
    // Avoid Vite 8 / Windows treating the component renderer's WGSL `?raw`
    // import as a literal filesystem path during SSR dependency optimization.
    optimizeDeps: { exclude: ["svelte"], include: [], noDiscovery: true },
  },
});
