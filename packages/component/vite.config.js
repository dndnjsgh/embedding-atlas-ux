import { fixAbsoluteImport } from "@embedding-atlas/utils/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import wasm from "vite-plugin-wasm";
import icons from "unplugin-icons/vite";

import { tsJsonSchemaPlugin } from "../viewer/scripts/vite-plugin-ts-json-schema.js";

const sourcePath = (path) => fileURLToPath(new URL(path, import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  // The full dashboard demo imports the Viewer application's Tailwind entry
  // point. Point Vite at the Viewer PostCSS configuration so those utility
  // classes are generated even though this dev server is rooted here.
  css: {
    postcss: sourcePath("../viewer/postcss.config.js"),
  },
  plugins: [
    svelte(),
    wasm(),
    icons({ compiler: "svelte" }),
    tsJsonSchemaPlugin(),
    dts({ rollupTypes: true }),
    fixAbsoluteImport(),
  ],
  worker: {
    plugins: () => [wasm()],
    format: "es",
    rolldownOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  build: {
    target: "esnext",
    lib: {
      entry: {
        index: "./src/lib/index.ts",
      },
      fileName: (_, entryName) => `${entryName}.js`,
      formats: ["es"],
    },
    rolldownOptions: {
      external: ["@uwdata/mosaic-core", "@uwdata/mosaic-sql", "@embedding-atlas/utils"],
    },
    copyPublicDir: false,
  },
  resolve: {
    alias: [
      // Resolve workspace imports to source in development. This avoids making
      // `npm run dev` depend on a prior `npm run build` that creates dist/.
      { find: "@embedding-atlas/component/svelte", replacement: sourcePath("./svelte/index.js") },
      { find: "@embedding-atlas/component", replacement: sourcePath("./src/lib/index.ts") },
      { find: /(.*\/worker_functions)\.js$/, replacement: "$1.ts" },
    ],
  },
  optimizeDeps: {
    exclude: ["svelte"],
  },
  ssr: {
    // Keep Vite's SSR dependency optimizer from attempting to load WGSL raw
    // imports as filesystem paths on Windows during a dev-server cold start.
    // Excluding Svelte also prevents vite-plugin-svelte from adding its SSR
    // pre-bundle entries, so `noDiscovery` can disable this optimizer entirely.
    optimizeDeps: { exclude: ["svelte"], include: [], noDiscovery: true },
  },
});
