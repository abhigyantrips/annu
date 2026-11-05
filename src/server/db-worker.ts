import { parentPort, workerData } from "node:worker_threads";
import { AnalyticsDatabase } from "./database.js";
const db = new AnalyticsDatabase(workerData.path, workerData.readonly);
parentPort!.on(
  "message",
  ({
    id,
    method,
    args,
  }: {
    id: number;
    method: keyof AnalyticsDatabase;
    args: unknown[];
  }) => {
    try {
      const fn = db[method];
      if (typeof fn !== "function" || method === ("constructor" as string))
        throw new Error("Unknown database operation");
      const result = (fn as (...args: unknown[]) => unknown).apply(db, args);
      parentPort!.postMessage({ id, result });
    } catch (error) {
      parentPort!.postMessage({
        id,
        error:
          error instanceof Error ? error.message : "Database operation failed",
      });
    }
  },
);
parentPort!.postMessage({ ready: true });
