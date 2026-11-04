import { InvalidCredentialsError, SessionOwnershipError, ValidationError } from "@teacherly/core";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiErrorBody {
  error: {
    code: string;
    issues?: readonly { field: string; code: string }[];
  };
}

/**
 * Map a domain error onto a response. The important property is the first
 * branch: every credential failure — unknown email, wrong password, email
 * already registered — produces byte-identical output, so nothing here can be
 * used to enumerate accounts.
 */
export function toErrorResponse(c: Context, error: unknown): Response {
  if (error instanceof InvalidCredentialsError) {
    return json(c, 401, { error: { code: error.code } });
  }
  if (error instanceof ValidationError) {
    return json(c, 400, { error: { code: error.code, issues: error.issues } });
  }
  if (error instanceof SessionOwnershipError) {
    return json(c, 403, { error: { code: error.code } });
  }

  // Anything unmapped is a bug, not a client problem. Log it server-side and
  // tell the caller nothing about it.
  console.error("[server] unhandled error", error);
  return json(c, 500, { error: { code: "internal_error" } });
}

export function unauthorized(c: Context): Response {
  return json(c, 401, { error: { code: "unauthenticated" } });
}

function json(c: Context, status: ContentfulStatusCode, body: ApiErrorBody): Response {
  return c.json(body, status);
}
