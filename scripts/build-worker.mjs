import { build } from "esbuild";
await build({
  entryPoints: ["src/server/db-worker.ts"],
  outfile: "dist/server/db-worker.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  sourcemap: true,
  target: "node22",
});
