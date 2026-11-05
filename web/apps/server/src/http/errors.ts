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
  /** Omitted entirely for a query error — see `carriesQueryText`. */
  message?: string;
  code?: unknown;
  /** The stack's `at ...` lines only, never its `Name: message` header. */
  frames?: string;
  query?: "[redacted]";
  params?: "[redacted]";
  cause?: LoggableError;
}

/**
 * Drizzle builds `DrizzleQueryError`'s message out of the statement and its
 * bound values:
 *
 *     super(`Failed query: ${query}\nparams: ${params}`)
 *
 * (`node_modules/drizzle-orm/errors.js`, and `Error.captureStackTrace` then
 * copies that message into the first line of `stack`). So the SQL and its
 * parameters are not merely *attached* to a query error as the `query` and
 * `params` properties — they are the free text of `message` and `stack` too.
 *
 * Dropping the two properties and allowing `message` and `stack` through, as
 * this module did before, therefore redacted nothing: a failing `teachers`
 * insert still put the teacher's email and their argon2id hash in the log
 * twice each, next to two `[redacted]` markers that made the line look
 * sanitised. This predicate is what the field list keys off instead.
 *
 * Matched three ways because any one of them can be absent: the own properties
 * the current driver sets, and the message prefix it writes, so a wrapper that
 * re-throws with only the text still trips it.
 */
function carriesQueryText(error: Error): boolean {
  return "query" in error || "params" in error || /^Failed query:/.test(error.message);
}

/**
 * The stack minus its header. V8 renders `stack` as `${name}: ${message}` plus
 * the frames, so keeping a query error's frames means dropping everything up
 * to the first one. Matching the frames rather than slicing off the first line
 * is deliberate: a `DrizzleQueryError` message is itself multi-line.
 */
function stackFrames(error: Error): string | undefined {
  if (typeof error.stack !== "string") return undefined;
  const frames = error.stack.split("\n").filter((line) => /^\s+at\s/.test(line));
  return frames.length > 0 ? frames.join("\n") : undefined;
}

/**
 * `DrizzleQueryError` never assigns `this.name`, so `error.name` is the
 * inherited `"Error"` — which is why an earlier version of this module's test
 * asserted a name of `"DrizzleQueryError"` against a hand-built fake and
 * passed, while the real error would have logged `"Error"`. The constructor is
 * where the identifying name actually is.
 */
function nameOf(error: Error): string {
  const fromConstructor: unknown = error.constructor?.name;
  if (typeof fromConstructor === "string" && fromConstructor.length > 0) return fromConstructor;
  return error.name;
}

/**
 * Reduce a thrown value to a fixed set of fields before it reaches the log.
 *
 * Handing a whole `Error` to `console.error` prints its own enumerable
 * properties, so the starting point is an allowlist: a future driver that
 * invents its own leaky property is covered automatically, because fields are
 * named in rather than filtered out.
 *
 * What an operator is left with for a failing query is the error's name, the
 * frames, and the driver error in `cause` — whose `message` is the constraint
 * or connection failure (`duplicate key value violates unique constraint
 * "teachers_email_unique"`, `connect ECONNREFUSED 127.0.0.1:5432`) and whose
 * `code` is the SQLSTATE. That is enough to identify the statement from the
 * frames without the log holding any of its values.
 *
 * Known boundary, stated rather than claimed closed: a driver `message` one
 * level down is kept verbatim, and Postgres does quote an offending value in
 * some of them (`invalid input syntax for type integer: "..."`). What is
 * demonstrated here is that the query and parameter text Drizzle attaches —
 * the path that leaked password hashes and addresses — no longer reaches the
 * log. `detail`, `where` and `internalQuery`, the pg fields that do carry row
 * values, are not on the allowlist and so never appear.
 */
function describeForLog(error: unknown, depth = 0): LoggableError {
  if (!(error instanceof Error)) {
    return { name: "NonError", message: typeof error };
  }

  const described: LoggableError = { name: nameOf(error) };

  if (carriesQueryText(error)) {
    // Not truncated — dropped. There is no prefix of `Failed query: <sql>
    // params: <values>` worth keeping, and a truncation that still showed the
    // start of the parameter list would be the same bug with a lower limit.
    described.query = "[redacted]";
    described.params = "[redacted]";
  } else {
    described.message = error.message;
  }

  // `code` is the one driver-supplied field that is diagnostic rather than
  // sensitive — Postgres SQLSTATE, Node's errno. Scalars only.
  const code: unknown = (error as { code?: unknown }).code;
  if (typeof code === "string" || typeof code === "number") described.code = code;

  const frames = stackFrames(error);
  if (frames !== undefined) described.frames = frames;

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
