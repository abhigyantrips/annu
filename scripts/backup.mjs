import Database from "better-sqlite3";
import { resolve } from "node:path";
const source = resolve(process.env.DATABASE_PATH || "data/annu.db");
const target = resolve(
  process.argv[2] ||
    `data/annu-backup-${new Date().toISOString().slice(0, 10)}.db`,
);
if (source === target)
  throw new Error("Backup destination must differ from source");
const db = new Database(source, { readonly: true });
try {
  await db.backup(target);
  console.log(`Backup saved to ${target}`);
} finally {
  db.close();
}
