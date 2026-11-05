import { spawn } from "node:child_process";
import { build, context } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("dist/public", { recursive: true });
await build({
  entryPoints: ["src/server/db-worker.ts"],
  outfile: "dist/server/db-worker.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  sourcemap: true,
});
const tracker = await context({
  entryPoints: ["src/tracker/index.ts"],
  outfile: "dist/public/script.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  minify: true,
});
await tracker.watch();
const children = [
  spawn("node", ["--import=tsx", "--watch", "src/server/index.ts"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  }),
  spawn("node_modules/.bin/vite", [], { stdio: "inherit" }),
];
function stop() {
  for (const child of children) child.kill("SIGTERM");
  tracker.dispose();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children)
  child.on("exit", () => {
    stop();
    process.exit();
  });
