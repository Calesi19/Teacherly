import { loadEnv, requireDatabaseUrl } from "@teacherly/db";

export interface ServerConfig {
  port: number;
  databaseUrl: string;
  /**
   * On unless `COOKIE_SECURE=false` is set explicitly, which is only honoured
   * outside production. Omitting the variable can never downgrade the cookie.
   */
  cookieSecure: boolean;
  /** Origin allowed to send credentialed requests in development. */
  devClientOrigin: string;
  isProduction: boolean;
  /**
   * The shared signup invite code. `undefined` disables signup entirely —
   * see `resolveSignupInviteCode`.
   */
  signupInviteCode: string | undefined;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.length === 0) return fallback;
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a valid port number, got "${raw}".`);
  }
  return port;
}

/** Just the environment entries this module reads. */
export type ConfigEnv = Readonly<Record<string, string | undefined>>;

/**
 * Whether the session cookie gets its `Secure` flag.
 *
 * Fail closed, for real this time. The previous expression was
 * `isProduction || COOKIE_SECURE === "true"`: it defaulted to `false` and
 * needed an explicit positive to turn `Secure` on, so an unset `NODE_ENV`
 * together with the `COOKIE_SECURE=false` that `.env.example` shipped served
 * the 14-day session cookie with no `Secure` flag — the opposite of what the
 * comment above it claimed. Now the *insecure* case is the one that has to be
 * asked for by name, and asking for it in production is a startup failure
 * rather than a silent downgrade.
 *
 * A pure function of the environment so it is testable without a `.env` file
 * on disk deciding the answer.
 */
export function resolveCookieSecure(env: ConfigEnv): boolean {
  const insecureOptIn = env["COOKIE_SECURE"] === "false";
  if (insecureOptIn && env["NODE_ENV"] === "production") {
    throw new Error("COOKIE_SECURE=false is not permitted when NODE_ENV=production.");
  }
  return !insecureOptIn;
}

/**
 * Mirrors `apps/web/vite.config.ts`: one variable, `DEV_CLIENT_PORT`, drives
 * the dev client's port everywhere so a busy 5173 is a one-line change rather
 * than three hardcoded copies.
 */
export function resolveDevClientOrigin(env: ConfigEnv): string {
  return env["DEV_CLIENT_ORIGIN"] ?? `http://localhost:${env["DEV_CLIENT_PORT"] ?? "5173"}`;
}

/**
 * The signup invite code, or `undefined` when there is none.
 *
 * Whitespace-only counts as none: a `SIGNUP_INVITE_CODE=` line left in a
 * `.env` should disable signup, not configure a code that an empty
 * `inviteCode` field would match.
 *
 * A pure function of the environment, like `resolveCookieSecure`, so the
 * fail-closed behaviour is testable without a `.env` file on disk deciding the
 * answer.
 */
export function resolveSignupInviteCode(env: ConfigEnv): string | undefined {
  const code = env["SIGNUP_INVITE_CODE"]?.trim() ?? "";
  return code.length === 0 ? undefined : code;
}

export function loadConfig(): ServerConfig {
  loadEnv();

  return {
    port: parsePort(process.env["PORT"], 3000),
    databaseUrl: requireDatabaseUrl(),
    cookieSecure: resolveCookieSecure(process.env),
    devClientOrigin: resolveDevClientOrigin(process.env),
    isProduction: process.env["NODE_ENV"] === "production",
    signupInviteCode: resolveSignupInviteCode(process.env),
  };
}
