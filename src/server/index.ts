import "dotenv/config";
import { resolve, dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { buildApp } from "./app.js";
const databasePath = resolve(process.env.DATABASE_PATH || "data/annu.db");
await mkdir(dirname(databasePath), { recursive: true });
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  const secretPath = resolve(dirname(databasePath), "session.key");
  try {
    sessionSecret = (await readFile(secretPath, "utf8")).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    sessionSecret = randomBytes(48).toString("hex");
    await writeFile(secretPath, sessionSecret, { mode: 0o600, flag: "wx" });
  }
}
const retentionDays = Number(process.env.RETENTION_DAYS ?? "400");
if (
  !Number.isInteger(retentionDays) ||
  (retentionDays !== 0 && retentionDays < 366)
)
  throw new Error("RETENTION_DAYS must be 0 (forever) or at least 366");
const app = await buildApp({
  databasePath,
  adminPassword: process.env.ADMIN_PASSWORD || "",
  sessionSecret,
  publicOrigin: process.env.PUBLIC_ORIGIN || undefined,
  trustCloudflare: process.env.TRUST_CLOUDFLARE_HEADERS === "true",
  retentionDays,
  logger: true,
});
const close = async () => {
  await app.close();
  process.exit(0);
};
process.on("SIGTERM", close);
process.on("SIGINT", close);
await app.listen({
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
});
