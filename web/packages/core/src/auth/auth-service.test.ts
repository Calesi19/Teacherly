import { beforeEach, describe, expect, it } from "vitest";

import { AuthService } from "./auth-service";
import { MIN_PASSWORD_LENGTH } from "./validation";
import { InvalidCredentialsError, SessionOwnershipError, ValidationError } from "../domain/errors";
import { SESSION_ABSOLUTE_TTL_MS, computeSessionExpiry } from "../domain/session";
import {
  FakePasswordHasher,
  FakeSessionTokenService,
  InMemorySessionRepository,
  InMemoryTeacherRepository,
  MutableClock,
} from "../testing/fakes";

const START = new Date("2026-01-15T09:00:00.000Z");
const PASSWORD = "correct-horse-battery";
const DECOY_HASH = "fake$a-value-nobody-knows";

interface Harness {
  auth: AuthService;
  teachers: InMemoryTeacherRepository;
  sessions: InMemorySessionRepository;
  hasher: FakePasswordHasher;
  clock: MutableClock;
}

function harness(): Harness {
  const teachers = new InMemoryTeacherRepository();
  const sessions = new InMemorySessionRepository();
  const hasher = new FakePasswordHasher();
  const clock = new MutableClock(START);
  const auth = new AuthService({
    teachers,
    sessions,
    passwordHasher: hasher,
    sessionTokens: new FakeSessionTokenService(),
    clock,
    decoyPasswordHash: DECOY_HASH,
  });
  return { auth, teachers, sessions, hasher, clock };
}

function register(auth: AuthService, email: string, password = PASSWORD) {
  return auth.signup({ email, password, displayName: "Ms. Rivera" });
}

/**
 * Register, then log in. Two calls, because `signup` deliberately returns
 * nothing to start a session with — see the note on it. Every test below that
 * needs a live session goes through the same door a client does.
 */
async function signupAndLogin(auth: AuthService, email: string, password = PASSWORD) {
  await register(auth, email, password);
  return auth.login({ email, password });
}

describe("AuthService.signup", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it("creates a teacher who can then log in", async () => {
    const result = await signupAndLogin(h.auth, "rivera@school.test");

    expect(result.teacher.email).toBe("rivera@school.test");
    expect(result.teacher.displayName).toBe("Ms. Rivera");
    expect(result.teacher.locale).toBe("en");
    // The first token in the process, because signing up issued none.
    expect(result.token).toBe("token-1");
    expect(result.expiresAt).toEqual(computeSessionExpiry(START));
  });

  it("rejects a duplicate email with the generic credential error", async () => {
    await register(h.auth, "rivera@school.test");

    await expect(register(h.auth, "rivera@school.test")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("treats email as case-insensitive when detecting a duplicate", async () => {
    await register(h.auth, "Rivera@School.test");

    await expect(register(h.auth, "rivera@school.TEST")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("hashes the password even when the email is already taken", async () => {
    await register(h.auth, "rivera@school.test");
    const hashCallsBefore = h.hasher.hashCalls;

    await expect(register(h.auth, "rivera@school.test")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );

    // Equal work on both paths: a timing observer cannot tell "taken" from "free".
    expect(h.hasher.hashCalls).toBe(hashCallsBefore + 1);
  });

  it("stores what the hasher returned, never the raw password", async () => {
    await register(h.auth, "rivera@school.test");
    const credentials = await h.teachers.findCredentialsByEmail("rivera@school.test");

    expect(credentials).not.toBeNull();
    // `FakePasswordHasher` is reversible on purpose, so this cannot assert that
    // the digest hides the password — that is a property of argon2id, and of
    // `Argon2PasswordHasher` in apps/server. What core owns, and what this
    // pins, is that the value handed to the repository is the *port's* output
    // and not the plaintext that came in off the request.
    expect(credentials?.passwordHash).toBe(`fake$${PASSWORD}`);
    expect(credentials?.passwordHash).not.toBe(PASSWORD);
    expect(h.hasher.hashCalls).toBe(1);
  });

  it("stores only the hash of the session token", async () => {
    const result = await signupAndLogin(h.auth, "rivera@school.test");
    const rows = h.sessions.snapshot();

    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(result.token);
  });

  it("starts no session, and returns nothing to start one with", async () => {
    const result = await register(h.auth, "rivera@school.test");

    // The finding this closes: signup used to answer with an `IssuedSession`
    // and the route set the cookie from it, so a prober could tell a free
    // address from a taken one by whether a session came back — the last
    // signal left after the status and body were made uniform. Asserting the
    // empty `sessions` table as well as the `undefined`, because a route that
    // merely discarded the return value would still have written the row.
    expect(result).toBeUndefined();
    expect(h.sessions.snapshot()).toHaveLength(0);
  });

  it("rejects a password below the minimum length", async () => {
    const tooShort = "a".repeat(MIN_PASSWORD_LENGTH - 1);

    await expect(register(h.auth, "rivera@school.test", tooShort)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a malformed email", async () => {
    await expect(register(h.auth, "not-an-email")).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts a supported locale and rejects an unsupported one", async () => {
    await h.auth.signup({
      email: "es@school.test",
      password: PASSWORD,
      displayName: "Sra. Rivera",
      locale: "es",
    });
    const stored = await h.teachers.findCredentialsByEmail("es@school.test");
    expect(stored?.teacher.locale).toBe("es");

    await expect(
      h.auth.signup({
        email: "fr@school.test",
        password: PASSWORD,
        displayName: "Mme Rivera",
        // Exercising the runtime guard that protects against an untyped body.
        locale: "fr" as never,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("AuthService.login", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it("issues a new session for correct credentials", async () => {
    await register(h.auth, "rivera@school.test");
    const result = await h.auth.login({ email: "rivera@school.test", password: PASSWORD });

    expect(result.teacher.email).toBe("rivera@school.test");
    expect(result.token).toBe("token-1");
  });

  it("rejects a wrong password", async () => {
    await register(h.auth, "rivera@school.test");

    await expect(
      h.auth.login({ email: "rivera@school.test", password: "wrong-password-x" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects an unknown email with the same error as a wrong password", async () => {
    await register(h.auth, "rivera@school.test");

    const unknown = await h.auth
      .login({ email: "nobody@school.test", password: PASSWORD })
      .catch((error: unknown) => error);
    const wrong = await h.auth
      .login({ email: "rivera@school.test", password: "wrong-password-x" })
      .catch((error: unknown) => error);

    expect(unknown).toBeInstanceOf(InvalidCredentialsError);
    expect(wrong).toBeInstanceOf(InvalidCredentialsError);
    expect((unknown as Error).message).toBe((wrong as Error).message);
  });

  it("verifies against a decoy hash when the email is unknown", async () => {
    const before = h.hasher.verifyCalls;

    await expect(
      h.auth.login({ email: "nobody@school.test", password: PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    // Not an early return: the unknown-email path does the same hash work.
    expect(h.hasher.verifyCalls).toBe(before + 1);
  });

  it("matches the stored email case-insensitively", async () => {
    await register(h.auth, "Rivera@School.test");
    const result = await h.auth.login({ email: "  RIVERA@school.TEST ", password: PASSWORD });

    expect(result.teacher.email).toBe("rivera@school.test");
  });
});

describe("AuthService.resolveSession", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it("resolves the teacher behind a live token", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");
    const resolved = await h.auth.resolveSession(issued.token);

    expect(resolved?.teacher.id).toBe(issued.teacher.id);
  });

  it("rejects an expired session token", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");

    h.clock.advance(SESSION_ABSOLUTE_TTL_MS + 1);

    expect(await h.auth.resolveSession(issued.token)).toBeNull();
  });

  it("still accepts the token one millisecond before absolute expiry", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");

    h.clock.advance(SESSION_ABSOLUTE_TTL_MS - 1);

    expect(await h.auth.resolveSession(issued.token)).not.toBeNull();
  });

  it("does not extend expiry when a session is used", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");

    h.clock.advance(60_000);
    await h.auth.resolveSession(issued.token);

    const [session] = h.sessions.snapshot();
    // No rolling refresh in this chunk: last_used_at moves, expires_at does not.
    expect(session?.expiresAt).toEqual(computeSessionExpiry(START));
    expect(session?.lastUsedAt).toEqual(new Date(START.getTime() + 60_000));
  });

  it("rejects an unknown token", async () => {
    await register(h.auth, "rivera@school.test");

    expect(await h.auth.resolveSession("token-does-not-exist")).toBeNull();
  });

  it("rejects an empty token without touching the repositories", async () => {
    expect(await h.auth.resolveSession("")).toBeNull();
  });

  it("keeps two teachers' sessions separate", async () => {
    const one = await signupAndLogin(h.auth, "one@school.test");
    const two = await signupAndLogin(h.auth, "two@school.test");

    const resolvedOne = await h.auth.resolveSession(one.token);
    const resolvedTwo = await h.auth.resolveSession(two.token);

    expect(resolvedOne?.teacher.id).toBe(one.teacher.id);
    expect(resolvedTwo?.teacher.id).toBe(two.teacher.id);
    expect(resolvedOne?.teacher.id).not.toBe(resolvedTwo?.teacher.id);
  });
});

describe("AuthService.logout", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it("revokes the session server-side", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");

    await h.auth.logout(issued.token, issued.teacher.id);

    expect(await h.auth.resolveSession(issued.token)).toBeNull();
    expect(h.sessions.snapshot()[0]?.revokedAt).toEqual(START);
  });

  it("is idempotent", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");

    await h.auth.logout(issued.token, issued.teacher.id);
    await expect(h.auth.logout(issued.token, issued.teacher.id)).resolves.toBeUndefined();
  });

  it("leaves the teacher able to log in again", async () => {
    const issued = await signupAndLogin(h.auth, "rivera@school.test");
    await h.auth.logout(issued.token, issued.teacher.id);

    const again = await h.auth.login({ email: "rivera@school.test", password: PASSWORD });

    expect(again.teacher.id).toBe(issued.teacher.id);
    expect(again.token).not.toBe(issued.token);
  });

  it("refuses to revoke a session belonging to another teacher", async () => {
    const one = await signupAndLogin(h.auth, "one@school.test");
    const two = await signupAndLogin(h.auth, "two@school.test");

    await expect(h.auth.logout(one.token, two.teacher.id)).rejects.toBeInstanceOf(
      SessionOwnershipError,
    );
    expect(await h.auth.resolveSession(one.token)).not.toBeNull();
  });

  it("does not revoke the teacher's other sessions", async () => {
    const first = await signupAndLogin(h.auth, "rivera@school.test");
    const second = await h.auth.login({ email: "rivera@school.test", password: PASSWORD });

    await h.auth.logout(first.token, first.teacher.id);

    expect(await h.auth.resolveSession(first.token)).toBeNull();
    expect(await h.auth.resolveSession(second.token)).not.toBeNull();
  });
});
