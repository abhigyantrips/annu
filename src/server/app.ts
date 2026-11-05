import Fastify, { LogController } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { createHash, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import { z } from "zod";
import { eventSchema, type Geo } from "./events.js";
import { DatabaseWorker } from "./workers.js";
import type { Row } from "../shared/types.js";

export type AppOptions = {
  databasePath: string;
  adminPassword: string;
  sessionSecret: string;
  publicOrigin?: string;
  trustCloudflare?: boolean;
  retentionDays?: number;
  logger?: boolean;
  serveStatic?: boolean;
};
const querySchema = z
  .object({
    from: z.coerce.number().int().min(0),
    to: z.coerce.number().int().min(1),
  })
  .refine(
    (v) => v.to > v.from && v.to - v.from <= 732 * 86_400_000,
    "Choose a range of at most two years",
  );
const siteSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(100),
  domains: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .max(253)
        .refine((v) => {
          try {
            const url = new URL(`https://${v}`);
            return (
              url.host === v &&
              !url.username &&
              !url.password &&
              url.pathname === "/" &&
              !url.search &&
              !url.hash
            );
          } catch {
            return false;
          }
        }, "Use hostnames without a scheme or path"),
    )
    .min(1)
    .max(30),
});
const labelSchema = z.object({
  id: z.uuid().optional(),
  dimension: z.enum(["source", "medium", "campaign"]),
  name: z.string().trim().min(1).max(100),
  values: z.array(z.string().trim().min(1).max(300)).min(1).max(100),
});
const uuid = (value: unknown) => z.uuid().parse(value);
function csvValue(value: unknown) {
  const text = String(value ?? "");
  // Neutralize spreadsheet formulas in untrusted paths, UTMs and titles.
  return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
}
export async function buildApp(options: AppOptions) {
  if (options.adminPassword.length < 12)
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
  if (options.sessionSecret.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  const writer = new DatabaseWorker(options.databasePath, false);
  try {
    await writer.ready;
  } catch (error) {
    await writer.close();
    throw error;
  }
  const reader = new DatabaseWorker(options.databasePath, true);
  try {
    await reader.ready;
  } catch (error) {
    await Promise.all([writer.close(), reader.close()]);
    throw error;
  }
  const app = Fastify({
    logger: options.logger ?? false,
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: 16_384,
    requestTimeout: 10_000,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5000,
  });
  await app.register(cookie, { secret: options.sessionSecret });
  await app.register(rateLimit, {
    global: false,
    max: 5,
    timeWindow: "1 minute",
  });
  app.addContentTypeParser(
    "text/plain",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch {
        done(new Error("Invalid JSON"));
      }
    },
  );
  app.addHook("onSend", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "same-origin");
    if (req.url.startsWith("/api")) reply.header("Cache-Control", "no-store");
    else if (!req.url.startsWith("/script.js"))
      reply.header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
  });
  app.addHook("preHandler", async (request, reply) => {
    const path = request.routeOptions.url || request.url.split("?")[0];
    if (
      !path.startsWith("/api/") ||
      ["/api/collect", "/api/login"].includes(path)
    )
      return;
    const session = request.cookies["annu.session"];
    const unsigned = session ? request.unsignCookie(session) : null;
    let valid = false;
    try {
      valid = !!unsigned?.valid && Number(unsigned.value) > Date.now();
    } catch {
      /* Invalid cookie. */
    }
    if (!valid) return reply.code(401).send({ error: "Sign in to continue" });
    if (request.method !== "GET" && request.headers.origin) {
      const expected =
        options.publicOrigin || `${request.protocol}://${request.host}`;
      if (request.headers.origin !== expected)
        return reply.code(403).send({ error: "Origin not allowed" });
    }
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ error: error.issues[0]?.message || "Invalid request" });
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint"))
      return reply.code(409).send({
        error:
          "This name or UTM value is already assigned. Each value can belong to one label per dimension.",
      });
    if (message.includes("FOREIGN KEY"))
      return reply.code(404).send({ error: "Site or record not found" });
    if (message.endsWith("not found"))
      return reply.code(404).send({ error: message });
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode < 500
    )
      return reply.code(error.statusCode).send({
        error:
          error.statusCode === 429
            ? "Too many attempts. Try again in a minute."
            : "Invalid request",
      });
    request.log.error(
      { operation: request.routeOptions.url, error: message },
      "Operation failed",
    );
    return reply
      .code(503)
      .send({ error: "Analytics is temporarily unavailable" });
  });
  app.get("/health", async (_request, reply) => {
    await reader.call("sites");
    return reply.send({ status: "ok" });
  });
  app.post(
    "/api/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = z
        .object({ password: z.string().max(1000) })
        .parse(request.body);
      const digest = (value: string) =>
        createHash("sha256").update(value).digest();
      if (
        !timingSafeEqual(digest(body.password), digest(options.adminPassword))
      )
        return reply.code(401).send({ error: "Incorrect password" });
      reply.setCookie("annu.session", String(Date.now() + 7 * 86_400_000), {
        path: "/",
        signed: true,
        httpOnly: true,
        sameSite: "strict",
        secure: options.publicOrigin?.startsWith("https:") ?? false,
        maxAge: 7 * 86400,
      });
      return { ok: true };
    },
  );
  app.get("/api/session", async () => ({ authenticated: true }));
  app.post("/api/logout", async (_request, reply) =>
    reply.clearCookie("annu.session", { path: "/" }).send({ ok: true }),
  );
  app.get("/api/sites", async () => reader.call("sites"));
  app.post("/api/sites", async (request) =>
    writer.call("saveSite", siteSchema.parse(request.body)),
  );
  app.post("/api/collect", async (request, reply) => {
    // Simple text/plain requests avoid a CORS preflight and don't need a response body.
    const parsed = eventSchema.safeParse(request.body);
    const origin = request.headers.origin;
    if (!parsed.success || !origin || origin === "null")
      return reply.code(400).send();
    const geo: Geo = { country: null, region: null, city: null };
    if (options.trustCloudflare) {
      const header = (name: string, max: number) => {
        const raw = request.headers[name];
        if (typeof raw !== "string") return null;
        let decoded = raw;
        try {
          decoded = decodeURIComponent(raw);
        } catch {
          /* Preserve undecodable percent sequences. */
        }
        // Node's HTTP parser exposes raw UTF-8 header bytes as Latin-1. Support that and percent encoding.
        if (decoded === raw) {
          const utf8 = Buffer.from(raw, "latin1").toString("utf8");
          if (!utf8.includes("\uFFFD")) decoded = utf8;
        }
        return decoded.slice(0, max);
      };
      const country = header("cf-ipcountry", 2);
      geo.country =
        country && /^[A-Z]{2}$/.test(country) && country !== "XX"
          ? country
          : null;
      geo.region = header("cf-region-code", 100);
      geo.city = header("cf-ipcity", 150);
    }
    const result = await writer.call("ingest", parsed.data, origin, geo);
    if (result === "rejected") return reply.code(403).send();
    return reply
      .header("Access-Control-Allow-Origin", origin)
      .header("Vary", "Origin")
      .code(204)
      .send();
  });
  app.get<{ Params: { siteId: string } }>(
    "/api/sites/:siteId/report",
    async (request) => {
      const range = querySchema.parse(request.query);
      return reader.call(
        "report",
        uuid(request.params.siteId),
        range.from,
        range.to,
      );
    },
  );
  app.get<{ Params: { siteId: string } }>(
    "/api/sites/:siteId/activity",
    async (request) => {
      const range = querySchema.parse(request.query);
      const { before, beforeId } = z
        .object({
          before: z.coerce.number().int().positive().optional(),
          beforeId: z.uuid().optional(),
        })
        .parse(request.query);
      return reader.call(
        "activity",
        uuid(request.params.siteId),
        range.from,
        range.to,
        before,
        beforeId,
      );
    },
  );
  app.get<{ Params: { siteId: string; visitorId: string } }>(
    "/api/sites/:siteId/visitors/:visitorId",
    async (request) => {
      const { before } = z
        .object({ before: z.coerce.number().int().positive().optional() })
        .parse(request.query);
      return reader.call(
        "timeline",
        uuid(request.params.siteId),
        uuid(request.params.visitorId),
        before,
      );
    },
  );
  app.get<{ Params: { siteId: string } }>(
    "/api/sites/:siteId/labels",
    async (request) => reader.call("labels", uuid(request.params.siteId)),
  );
  app.post<{ Params: { siteId: string } }>(
    "/api/sites/:siteId/labels",
    async (request) =>
      writer.call("saveLabel", {
        ...labelSchema.parse(request.body),
        siteId: uuid(request.params.siteId),
      }),
  );
  app.delete<{ Params: { siteId: string; labelId: string } }>(
    "/api/sites/:siteId/labels/:labelId",
    async (request, reply) => {
      await writer.call(
        "deleteLabel",
        uuid(request.params.siteId),
        uuid(request.params.labelId),
      );
      return reply.code(204).send();
    },
  );
  app.get<{ Params: { siteId: string } }>(
    "/api/sites/:siteId/export",
    async (request, reply) => {
      const siteId = uuid(request.params.siteId);
      const { from, to } = querySchema.parse(request.query);
      const { format, kind } = z
        .object({
          format: z.enum(["csv", "json"]).default("csv"),
          kind: z
            .enum(["views", "visits", "clicks", "vitals"])
            .default("views"),
        })
        .parse(request.query);
      const exportTo = Math.min(to, Date.now());
      async function* rows() {
        let after = "",
          first = true,
          columns: string[] = [];
        if (format === "json") yield "[";
        while (!reply.raw.destroyed) {
          const batch: Row[] = await reader.call(
            "exportRows",
            siteId,
            from,
            exportTo,
            kind,
            after,
          );
          if (!batch.length) break;
          if (!columns.length) {
            columns = Object.keys(batch[0]);
            if (format === "csv")
              yield columns.map(csvValue).join(",") + "\r\n";
          }
          for (const row of batch) {
            if (format === "csv")
              yield columns.map((key) => csvValue(row[key])).join(",") + "\r\n";
            else {
              yield `${first ? "" : ","}${JSON.stringify(row)}`;
              first = false;
            }
          }
          after = String(batch[batch.length - 1].id);
          if (batch.length < 1000) break;
        }
        if (format === "json") yield "]";
      }
      reply
        .header(
          "Content-Disposition",
          `attachment; filename="annu-${kind}.${format}"`,
        )
        .type(
          format === "csv" ? "text/csv; charset=utf-8" : "application/json",
        );
      return reply.send(Readable.from(rows()));
    },
  );
  if (options.serveStatic !== false) {
    await app.register(staticPlugin, {
      root: resolve("dist/public"),
      maxAge: "1h",
      index: ["index.html"],
    });
    app.get("/stroke.js", async (_request, reply) =>
      reply.sendFile("script.js"),
    );
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Not found" })
        : reply.code(404).send("Not found"),
    );
  }
  const prune = setInterval(
    () =>
      writer
        .call("prune", options.retentionDays ?? 400)
        .catch((error) =>
          app.log.error({ error: error.message }, "Retention pass failed"),
        ),
    60_000,
  );
  prune.unref();
  app.addHook("onClose", async () => {
    clearInterval(prune);
    await Promise.all([writer.close(), reader.close()]);
  });
  return app;
}
