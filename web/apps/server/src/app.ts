import type { AuthService } from "@teacherly/core";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { CookieOptions } from "./http/cookies";
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

  app.route("/api/auth", authRoutes({ auth: deps.auth, cookie: deps.cookie }));
  app.route("/api/me", meRoute());

  app.notFound((c) => c.json({ error: { code: "not_found" } }, 404));

  return app;
}
