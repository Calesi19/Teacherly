import type { AuthService } from "@teacherly/core";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { CookieOptions } from "./http/cookies";
import { toErrorResponse } from "./http/errors";
import {
  AUTH_IP_RATE_LIMIT,
  FixedWindowRateLimiter,
  ipRateLimit,
  type ClientIpResolver,
} from "./http/rate-limit";
import { sessionMiddleware, type AppEnv } from "./http/session-middleware";
import { authRoutes, meRoute } from "./routes/auth-routes";

export interface AppDeps {
  auth: AuthService;
  cookie: CookieOptions;
  /**
   * Set in development only. The Vite dev server runs on another port, so the
   * browser needs an explicit credentialed-CORS allowance; in production the
   * client is served from the same origin and this stays undefined.
   */
  devClientOrigin?: string | undefined;
  /**
   * How to attribute a request to a client for rate limiting. `main.ts`
   * supplies the real socket address; tests and any non-node host fall back to
   * a single shared bucket, which is safe because it only ever over-counts.
   */
  clientIp?: ClientIpResolver | undefined;
}

export function createApp(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  if (deps.devClientOrigin !== undefined) {
    app.use(
      "/api/*",
      cors({
        origin: deps.devClientOrigin,
        credentials: true,
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      }),
    );
  }

  // Liveness only — no database touch, so `pnpm dev` and Playwright can tell
  // "process is listening" apart from "database is reachable".
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // Every API route resolves the session first. Nothing downstream reads a
  // teacher id from anywhere else.
  app.use("/api/*", sessionMiddleware(deps.auth));

  // Per-IP limiting on the auth routes only, ahead of any argon2 work. The
  // per-email counter lives inside `authRoutes`, where the body is parsed.
  const ipLimiter = new FixedWindowRateLimiter(AUTH_IP_RATE_LIMIT);
  app.use("/api/auth/*", ipRateLimit(ipLimiter, deps.clientIp ?? (() => "unknown")));

  app.route("/api/auth", authRoutes({ auth: deps.auth, cookie: deps.cookie }));
  app.route("/api/me", meRoute());

  app.notFound((c) => c.json({ error: { code: "not_found" } }, 404));

  // The backstop. Without it, anything thrown outside a route's own try/catch
  // — middleware, a downed database during session resolution — escaped as
  // Hono's plain-text "Internal Server Error", which is neither this chunk's
  // `{"error":{"code":"internal_error"}}` shape nor covered by the log
  // redaction in `toErrorResponse`.
  app.onError((error, c) => toErrorResponse(c, error));

  return app;
}
