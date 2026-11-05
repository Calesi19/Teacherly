import { DrizzleQueryError } from "drizzle-orm/errors";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toErrorResponse } from "./errors";

/**
 * Finding: `toErrorResponse` handed whole `Error` objects to `console.error`,
 * which prints their own enumerable properties. Drizzle's `DrizzleQueryError`
 * carries `query` and `params`, so a failing `teachers` insert printed the
 * teacher's email and their argon2id password hash, and a login against a
 * downed database printed the address being tried.
 *
 * The first fix dropped the two *properties* and allowed `message` and `stack`
 * through, and these tests passed it — because they built the error by hand
 * with a short, parameter-free message and then only asserted that the output
 * still contained `"Failed query"`. The real error's message is
 * `Failed query: ${query}\nparams: ${params}`, so both secrets were still in
 * the log, twice each, beside the `[redacted]` markers.
 *
 * So the fixture is now a **real `DrizzleQueryError`**, imported from the
 * driver (a devDependency of this app, used by nothing but this file) and
 * constructed the way `pg`'s session does it. `encodesTheDriversBehaviour`
 * below asserts the properties of *drizzle* that the redaction depends on, so
 * if a future version stops putting values in the message this suite fails and
 * says so, instead of quietly re-testing our own assumption.
 */

const EMAIL = "leakproof@school.test";
const PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$aGFzaGhhc2hoYXNo";

const INSERT_SQL =
  'insert into "teachers" ("email", "password_hash", "display_name", "locale") values ($1, $2, $3, $4)';
const SELECT_SQL = 'select "id", "email", "password_hash" from "teachers" where "email" = $1';

/** CAL-9 case 1: a failing signup insert. The hash is a bound parameter. */
function failingInsert(): DrizzleQueryError {
  const driver = Object.assign(
    new Error('duplicate key value violates unique constraint "teachers_email_unique"'),
    {
      code: "23505",
      // pg puts the offending value here, which is why `detail` is not on the
      // allowlist in errors.ts.
      detail: `Key (email)=(${EMAIL}) already exists.`,
      severity: "ERROR",
    },
  );
  return new DrizzleQueryError(
    INSERT_SQL,
    [EMAIL, PASSWORD_HASH, "Leak Proof", "en"],
    driver,
  );
}

/** CAL-9 case 2: a login while the database is unreachable. */
function databaseUnreachable(): DrizzleQueryError {
  const driver = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
    code: "ECONNREFUSED",
    errno: -111,
    syscall: "connect",
  });
  return new DrizzleQueryError(SELECT_SQL, [EMAIL], driver);
}

/** `toErrorResponse` only needs `c.json`; a real Hono context is overkill. */
async function logFor(error: Error): Promise<{ text: string; entry: Record<string, unknown> }> {
  const logged: unknown[][] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logged.push(args);
  });

  const app = new Hono();
  app.get("/", (c) => toErrorResponse(c, error));
  await app.request("http://localhost/");
  spy.mockRestore();

  return {
    // Everything that reached the log, as one string — the scan an operator
    // grepping the log file would do.
    text: JSON.stringify(logged),
    entry: (logged[0]?.[1] ?? {}) as Record<string, unknown>,
  };
}

describe("the DrizzleQueryError behaviour the redaction depends on", () => {
  it("puts the query and every bound parameter in the message and the stack", () => {
    const error = failingInsert();

    // If drizzle-orm changes any of these, the redaction in errors.ts is
    // keyed off the wrong thing and this is the test that should fail first.
    expect(error).toBeInstanceOf(DrizzleQueryError);
    expect(error.message).toContain(INSERT_SQL);
    expect(error.message).toContain(EMAIL);
    expect(error.message).toContain(PASSWORD_HASH);
    expect(error.stack).toContain(PASSWORD_HASH);
    expect(Object.keys(error)).toEqual(expect.arrayContaining(["query", "params"]));
  });

  it("does not set its own `name`, so `error.name` is only \"Error\"", () => {
    // The reason errors.ts reports `constructor.name`: the previous fixture
    // set `name` by hand and asserted "DrizzleQueryError", which the real
    // error never says.
    expect(failingInsert().name).toBe("Error");
    expect(failingInsert().constructor.name).toBe("DrizzleQueryError");
  });
});

describe("toErrorResponse logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs neither the password hash nor the email of a failing insert", async () => {
    const { text } = await logFor(failingInsert());

    expect(text).not.toContain(PASSWORD_HASH);
    expect(text).not.toContain("argon2id");
    expect(text).not.toContain(EMAIL);
    // The SQL itself goes too: it arrives in the same message as the values.
    expect(text).not.toContain("insert into");
    // pg's `detail` quotes the address as well, so it must not pass either.
    expect(text).not.toContain("already exists");
  });

  it("logs no address when the database is unreachable", async () => {
    const { text, entry } = await logFor(databaseUnreachable());

    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain("select");
    // But the reason is still there, one level down, which is the whole point
    // of keeping the cause.
    expect((entry["cause"] as Record<string, unknown>)["message"]).toContain("ECONNREFUSED");
  });

  it("keeps what an operator actually needs to debug a 500", async () => {
    const { entry } = await logFor(failingInsert());

    expect(entry["name"]).toBe("DrizzleQueryError");
    // Named, not silently dropped, so the log still shows a query was involved.
    expect(entry["query"]).toBe("[redacted]");
    expect(entry["params"]).toBe("[redacted]");
    // SQLSTATE and the constraint survive via the cause chain.
    const cause = entry["cause"] as Record<string, unknown>;
    expect(cause["code"]).toBe("23505");
    expect(cause["message"]).toContain("teachers_email_unique");
    // Frames, with the header that repeated the message removed.
    expect(typeof entry["frames"]).toBe("string");
    expect(entry["frames"]).toContain(" at ");
    expect(entry["frames"]).not.toContain("Failed query");
  });

  it("drops `message` for a query error rather than truncating it", async () => {
    const { entry } = await logFor(failingInsert());

    // The field list, in full. Anything else drizzle or pg invents later is
    // dropped because it was never named — including a `message` whose text
    // is the statement and its values.
    expect(Object.keys(entry).sort()).toEqual(["cause", "frames", "name", "params", "query"]);
    expect(entry).not.toHaveProperty("message");
    expect(entry).not.toHaveProperty("stack");
  });

  it("still keeps the message of an ordinary error, which carries no values", async () => {
    const { entry } = await logFor(new TypeError("cannot read properties of undefined"));

    expect(entry["name"]).toBe("TypeError");
    expect(entry["message"]).toBe("cannot read properties of undefined");
    expect(typeof entry["frames"]).toBe("string");
  });

  it("redacts a re-thrown query error that kept only the text", async () => {
    // No `query` or `params` properties at all — just the message a wrapper
    // copied. The message prefix is the third thing `carriesQueryText` looks
    // at, and this is the case it exists for.
    const { text, entry } = await logFor(
      new Error(`Failed query: ${INSERT_SQL}\nparams: ${EMAIL},${PASSWORD_HASH}`),
    );

    expect(text).not.toContain(PASSWORD_HASH);
    expect(text).not.toContain(EMAIL);
    expect(entry).not.toHaveProperty("message");
  });

  it("tells the client nothing about it", async () => {
    const app = new Hono();
    app.get("/", (c) => toErrorResponse(c, failingInsert()));
    const response = await app.request("http://localhost/");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error" } });
  });
});
