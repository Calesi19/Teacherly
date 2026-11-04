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
  console.error("[server] unhandled error", describeForLog(error));
  return json(c, 500, { error: { code: "internal_error" } });
}

/** Fields worth keeping from an unknown throw. Everything else is dropped. */
interface LoggableError {
  name: string;
  message: string;
  code?: unknown;
  stack?: string | undefined;
  query?: "[redacted]";
  params?: "[redacted]";
  cause?: LoggableError;
}

/**
 * Reduce a thrown value to a fixed set of scalar fields before it reaches the
 * log.
 *
 * Handing a whole `Error` to `console.error` prints its own enumerable
 * properties, and Drizzle's `DrizzleQueryError` carries `query` and `params`.
 * For a failing `teachers` insert that meant the argon2id password hash and
 * the teacher's email landed in the log; a login against a downed database
 * leaked the address being tried. Both are credentials-adjacent data that no
 * operator needs in order to debug a 500.
 *
 * Redacting here, at the single call site, rather than at every `throw`: a
 * future driver that invents its own leaky property is covered automatically,
 * because this allows fields through by name instead of filtering them out.
 */
function describeForLog(error: unknown, depth = 0): LoggableError {
  if (!(error instanceof Error)) {
    return { name: "NonError", message: typeof error };
  }

  const described: LoggableError = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // `code` is the one driver-supplied field that is diagnostic rather than
  // sensitive — Postgres SQLSTATE, Node's errno. Scalars only.
  const code: unknown = (error as { code?: unknown }).code;
  if (typeof code === "string" || typeof code === "number") described.code = code;

  // Name the leaky fields explicitly when present, so a reader of the log can
  // see that a query was involved without seeing its values.
  if ("query" in error) described.query = "[redacted]";
  if ("params" in error) described.params = "[redacted]";

  // Drizzle wraps the driver error in `cause`, which is where the SQLSTATE
  // usually lives. Bounded so a cycle cannot spin.
  if (depth < 3 && error.cause instanceof Error) {
    described.cause = describeForLog(error.cause, depth + 1);
  }

  return described;
}

export function unauthorized(c: Context): Response {
  return json(c, 401, { error: { code: "unauthenticated" } });
}

function json(c: Context, status: ContentfulStatusCode, body: ApiErrorBody): Response {
  return c.json(body, status);
}
