import { loadEnv, requireDatabaseUrl } from "@teacherly/db";

export interface ServerConfig {
  port: number;
  databaseUrl: string;
  /** `Secure` is omitted only for local development over plain http. */
  cookieSecure: boolean;
  /** Origin allowed to send credentialed requests in development. */
  devClientOrigin: string;
  isProduction: boolean;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.length === 0) return fallback;
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a valid port number, got "${raw}".`);
  }
  return port;
}

export function loadConfig(): ServerConfig {
  loadEnv();

  const isProduction = process.env["NODE_ENV"] === "production";

  return {
    port: parsePort(process.env["PORT"], 3000),
    databaseUrl: requireDatabaseUrl(),
    // Fail closed: anything that is not explicitly local development gets a
    // Secure cookie, so forgetting to set a variable cannot downgrade it.
    cookieSecure: isProduction || process.env["COOKIE_SECURE"] === "true",
    devClientOrigin: process.env["DEV_CLIENT_ORIGIN"] ?? "http://localhost:5173",
    isProduction,
  };
}
