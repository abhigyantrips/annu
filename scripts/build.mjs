import { build } from "esbuild";
import { build as viteBuild } from "vite";
await viteBuild();
await build({
  entryPoints: ["src/server/index.ts", "src/server/db-worker.ts"],
  outdir: "dist/server",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  sourcemap: true,
  target: "node22",
});
await build({
  entryPoints: ["src/tracker/index.ts"],
  outfile: "dist/public/script.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  minify: true,
  target: "es2020",
  legalComments: "none",
});
