import { Worker } from "node:worker_threads";
import { resolve } from "node:path";
import type { AnalyticsDatabase } from "./database.js";
type Method = {
  [K in keyof AnalyticsDatabase]: AnalyticsDatabase[K] extends (
    ...a: any[]
  ) => any
    ? K
    : never;
}[keyof AnalyticsDatabase];
export class DatabaseWorker {
  private worker: Worker;
  private pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private sequence = 0;
  private failure?: Error;
  ready: Promise<void>;
  constructor(path: string, readonly: boolean) {
    this.worker = new Worker(resolve("dist/server/db-worker.js"), {
      workerData: { path, readonly },
    });
    this.ready = new Promise((resolve, reject) => {
      this.worker.once("error", reject);
      this.worker.on("message", (message) => {
        if (message.ready) {
          resolve();
          return;
        }
        const item = this.pending.get(message.id);
        if (!item) return;
        clearTimeout(item.timer);
        this.pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error));
        else item.resolve(message.result);
      });
    });
    const fail = (error: Error) => {
      this.failure = error;
      for (const item of this.pending.values()) {
        clearTimeout(item.timer);
        item.reject(error);
      }
      this.pending.clear();
    };
    this.worker.on("error", fail);
    this.worker.on("exit", (code) =>
      fail(new Error(`Database worker exited (${code})`)),
    );
  }
  call<M extends Method>(
    method: M,
    ...args: Parameters<Extract<AnalyticsDatabase[M], (...a: any[]) => any>>
  ): Promise<ReturnType<Extract<AnalyticsDatabase[M], (...a: any[]) => any>>> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending.size >= 128)
      return Promise.reject(new Error("Database busy"));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      // Timed-out jobs remain counted until completed, bounding the actual worker queue.
      const timer = setTimeout(
        () => reject(new Error("Database deadline exceeded")),
        5000,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, method, args });
    });
  }
  async close() {
    await this.worker.terminate();
  }
}
