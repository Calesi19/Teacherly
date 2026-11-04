import type { Context } from "hono";

import type { AppEnv } from "./session-middleware";

/**
 * Read an untrusted JSON body without letting a malformed one throw a 500, and
 * refuse the request outright when it is not one a browser on this origin could
 * have made. Returns a `Response` in that case; callers must return it.
 *
 * Lifted out of `routes/auth-routes.ts`, where it was a private helper whose
 * own comment claimed that "every route added later inherits them" — which was
 * only true for routes added to that one file. This chunk adds nineteen routes
 * in four other files, so the helper had to actually be shared before that
 * claim became false.
 *
 * The attack it closes: `c.req.json()` is `JSON.parse(await text())` with no
 * `Content-Type` check, so a cross-site `<form enctype="text/plain">` POST
 * reaches an API route with no CORS preflight and the browser attaches the
 * victim's cookie. On the auth routes that meant an attacker could install
 * their own session; on these routes it would mean writing grades into a
 * teacher's workspace from any page they happened to visit.
 */
export async function readJson(
  c: Context<AppEnv>,
): Promise<Record<string, unknown> | Response> {
  // 1. A JSON content type cannot be produced by a simple cross-site form
  //    post, so requiring it reinstates the CORS preflight as a gate.
  const contentType = c.req.header("content-type")?.trim().toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return c.json({ error: { code: "unsupported_media_type" } }, 415);
  }

  // 2. Belt and braces for browsers that send it: `Sec-Fetch-Site` is set by
  //    the browser and cannot be forged by page script. Absent on non-browser
  //    clients (curl, the Playwright API context), so those still work.
  const site = c.req.header("sec-fetch-site");
  if (site !== undefined && site !== "same-origin" && site !== "none") {
    return c.json({ error: { code: "cross_site_request_blocked" } }, 403);
  }

  try {
    const body = await c.req.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Unknown fields are dropped rather than forwarded. The domain's validators do
 * the real work; this only stops arbitrary JSON reaching them.
 */
export function pickString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}
