import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["scripts/bench.ts"],
  outfile: "dist/server/bench.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
});
const result = spawnSync(process.execPath, ["dist/server/bench.js"], {
  stdio: "inherit",
  env: process.env,
});
process.exitCode = result.status ?? 1;
