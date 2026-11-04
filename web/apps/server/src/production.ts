import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";

import { createApp } from "./app";
import { loadConfig } from "./config";
import { createContainer } from "./container";
import { toErrorResponse } from "./http/errors";

/**
 * Production entry point (the Fly.io deploy runs this; local development
 * keeps using `main.ts` with the Vite dev server on its own port).
 *
 * `config.ts` assumes that in production the client is served from the same
 * origin as the API — no CORS origin is configured and the session cookie is
 * same-origin — but nothing in `app.ts` actually serves the client build.
 * This entry point closes that gap without changing `app.ts`: it mounts the
 * API app first, then serves `apps/web/dist` for everything else, falling
 * back to `index.html` for client-side routes. Unknown `/api/*` paths keep
 * the API's JSON 404 shape.
 */

const config = loadConfig();
const container = await createContainer(config.databaseUrl);

const api = createApp({
  auth: container.auth,
  cookie: { secure: config.cookieSecure },
  // Same reasoning as main.ts: the socket's remote address, never a
  // forwarded header. Behind Fly's proxy that address is the proxy's, so the
  // per-email limiter inside the auth routes carries the load.
  clientIp: (c) => getConnInfo(c).remote.address ?? "unknown",
});

const clientDistDir = join(process.cwd(), "apps/web/dist");
const indexHtml = await readFile(join(clientDistDir, "index.html"), "utf8");

const app = new Hono();
app.route("/", api);
app.use("/*", serveStatic({ root: clientDistDir }));
app.get("*", (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: { code: "not_found" } }, 404);
  }
  return c.html(indexHtml);
});
app.onError((error, c) => toErrorResponse(c, error));

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] listening on http://localhost:${info.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] ${signal} received, shutting down`);
  server.close();
  await container.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
