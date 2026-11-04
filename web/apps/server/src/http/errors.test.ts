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
 * These tests reconstruct that error's shape rather than importing Drizzle, so
 * they keep working if the driver changes — what is being asserted is that
 * nothing outside an allowed set of fields reaches the log.
 */

const EMAIL = "leakproof@school.test";
const PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$aGFzaGhhc2hoYXNo";

/** The shape Drizzle throws: a wrapper with `query`/`params`, driver in `cause`. */
function drizzleQueryError(): Error {
  const driver = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: "23505",
    detail: `Key (email)=(${EMAIL}) already exists.`,
    severity: "ERROR",
  });
  return Object.assign(
    new Error("Failed query: insert into \"teachers\" ...", { cause: driver }),
    {
      name: "DrizzleQueryError",
      query: 'insert into "teachers" ("email", "password_hash", "display_name", "locale") values ($1, $2, $3, $4)',
      params: [EMAIL, PASSWORD_HASH, "Leak Proof", "en"],
    },
  );
}

function fakeContext() {
  // `toErrorResponse` only needs `c.json`; a real Hono context is overkill.
  const app = new Hono();
  let captured: unknown;
  app.get("/", (c) => {
    captured = toErrorResponse(c, drizzleQueryError());
    return c.body(null, 204);
  });
  return { app, get captured() { return captured; } };
}

describe("toErrorResponse logging", () => {
  let logged: unknown[][];

  beforeEach(() => {
    logged = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs neither the password hash nor the email of a failing query", async () => {
    const { app } = fakeContext();
    await app.request("http://localhost/");

    const text = JSON.stringify(logged);
    expect(text).not.toContain(PASSWORD_HASH);
    expect(text).not.toContain(EMAIL);
    // The driver's `detail` quotes the address too, so it must not pass either.
    expect(text).not.toContain("already exists");
  });

  it("keeps what an operator actually needs to debug a 500", async () => {
    const { app } = fakeContext();
    await app.request("http://localhost/");

    const entry = logged[0]?.[1] as Record<string, unknown>;
    expect(entry["name"]).toBe("DrizzleQueryError");
    expect(entry["message"]).toContain("Failed query");
    expect(typeof entry["stack"]).toBe("string");
    // The leaky fields are named, not silently dropped, so the log still shows
    // that a query was involved.
    expect(entry["query"]).toBe("[redacted]");
    expect(entry["params"]).toBe("[redacted]");
    // SQLSTATE survives via the cause chain — that is the diagnostic value.
    expect((entry["cause"] as Record<string, unknown>)["code"]).toBe("23505");
  });

  it("tells the client nothing about it", async () => {
    const app = new Hono();
    app.get("/", (c) => toErrorResponse(c, drizzleQueryError()));
    const response = await app.request("http://localhost/");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error" } });
  });
});
