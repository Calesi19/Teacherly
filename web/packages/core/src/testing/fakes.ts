import { isSessionActive, type NewSession, type Session } from "../domain/session";
import { asTeacherId, type NewTeacher, type Teacher, type TeacherCredentials, type TeacherId } from "../domain/teacher";
import type { Clock } from "../ports/clock";
import type { PasswordHasher } from "../ports/password-hasher";
import type {
  RevokeSessionInput,
  SessionRepository,
  TouchSessionInput,
} from "../ports/session-repository";
import type { SessionTokenService } from "../ports/session-token-service";
import type { TeacherRepository } from "../ports/teacher-repository";
import { normalizeEmail } from "../auth/validation";

/** A clock the test moves by hand. */
export class MutableClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  set(at: Date): void {
    this.current = new Date(at.getTime());
  }
}

/**
 * A hasher that is honest about what it is. Reversible and instant, so the auth
 * tests do not pay argon2's cost; the real argon2id hasher lives in apps/server.
 */
export class FakePasswordHasher implements PasswordHasher {
  hashCalls = 0;
  verifyCalls = 0;

  async hash(plaintext: string): Promise<string> {
    this.hashCalls += 1;
    return `fake$${plaintext}`;
  }

  async verify(storedHash: string, plaintext: string): Promise<boolean> {
    this.verifyCalls += 1;
    return storedHash === `fake$${plaintext}`;
  }
}

/** Deterministic tokens so assertions can name them. */
export class FakeSessionTokenService implements SessionTokenService {
  private counter = 0;

  constructor(private readonly prefix = "token") {}

  generate(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }

  hash(token: string): string {
    return `sha256:${token}`;
  }
}

export class InMemoryTeacherRepository implements TeacherRepository {
  private readonly byId = new Map<TeacherId, Teacher>();
  private readonly hashById = new Map<TeacherId, string>();
  private nextId = 1;

  async findById(teacherId: TeacherId): Promise<Teacher | null> {
    return this.byId.get(teacherId) ?? null;
  }

  async findCredentialsByEmail(email: string): Promise<TeacherCredentials | null> {
    // Normalizing here mirrors the contract the Drizzle implementation honours:
    // matching is case-insensitive inside the repository, not at the call site.
    const needle = normalizeEmail(email);
    for (const teacher of this.byId.values()) {
      if (teacher.email === needle) {
        const passwordHash = this.hashById.get(teacher.id);
        if (passwordHash === undefined) return null;
        return { teacher, passwordHash };
      }
    }
    return null;
  }

  async create(input: NewTeacher): Promise<Teacher | null> {
    const email = normalizeEmail(input.email);
    if ((await this.findCredentialsByEmail(email)) !== null) return null;

    const now = new Date();
    const teacher: Teacher = {
      // Stands in for reading the id back out of the `teachers` table, which
      // is the real mint point. Test doubles are the only other caller.
      id: asTeacherId(`teacher-${this.nextId++}`),
      email,
      displayName: input.displayName,
      locale: input.locale,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(teacher.id, teacher);
    this.hashById.set(teacher.id, input.passwordHash);
    return teacher;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly byTokenHash = new Map<string, Session>();
  private nextId = 1;

  async create(input: NewSession): Promise<Session> {
    const session: Session = {
      id: `session-${this.nextId++}`,
      teacherId: input.teacherId,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      lastUsedAt: input.createdAt,
      revokedAt: null,
    };
    this.byTokenHash.set(input.tokenHash, session);
    return session;
  }

  async findActiveByTokenHash(tokenHash: string, now: Date): Promise<Session | null> {
    const session = this.byTokenHash.get(tokenHash);
    if (session === undefined) return null;
    // The filter belongs to the repository in both implementations.
    if (!isSessionActive(session, now)) return null;
    return session;
  }

  async revoke(input: RevokeSessionInput): Promise<void> {
    for (const session of this.byTokenHash.values()) {
      if (session.id === input.sessionId && session.teacherId === input.teacherId) {
        session.revokedAt = input.revokedAt;
      }
    }
  }

  async touch(input: TouchSessionInput): Promise<void> {
    for (const session of this.byTokenHash.values()) {
      if (session.id === input.sessionId && session.teacherId === input.teacherId) {
        session.lastUsedAt = input.at;
      }
    }
  }

  /** Test-only reach-in, for asserting on rows the ports do not expose. */
  snapshot(): Session[] {
    return [...this.byTokenHash.values()].map((session) => ({ ...session }));
  }
}
