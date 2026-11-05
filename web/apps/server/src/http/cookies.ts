import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

/**
 * The cookie carries nothing but the opaque session token — no teacher id, no
 * email, no expiry claim. Everything about the session is looked up server-side
 * from its hash, so a tampered cookie can only ever fail to resolve.
 */
export const SESSION_COOKIE = "teacherly_session";

/**
 * Scoped to the API path: the SPA's own document and assets are served from
 * `/`, and never need the credential, so the browser should not attach it there.
 */
const COOKIE_PATH = "/api";

export interface CookieOptions {
  secure: boolean;
}

export function setSessionCookie(
  c: Context,
  token: string,
  expiresAt: Date,
  options: CookieOptions,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    // Lax rather than Strict: the app has no cross-site POST surface to protect
    // beyond this, and Strict would drop the cookie on a plain inbound link.
    sameSite: "Lax",
    secure: options.secure,
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function clearSessionCookie(c: Context, options: CookieOptions): void {
  // Attributes must match the ones used to set it or the browser keeps the old
  // cookie alongside the deletion.
  deleteCookie(c, SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "Lax",
    secure: options.secure,
    path: COOKIE_PATH,
  });
}
