import { InvalidCredentialsError, SessionOwnershipError } from "../domain/errors";
import { computeSessionExpiry, type Session } from "../domain/session";
import type { Teacher, TeacherId } from "../domain/teacher";
import type { Clock } from "../ports/clock";
import type { PasswordHasher } from "../ports/password-hasher";
import type { SessionRepository } from "../ports/session-repository";
import type { SessionTokenService } from "../ports/session-token-service";
import type { TeacherRepository } from "../ports/teacher-repository";
import {
  validateLogin,
  validateSignup,
  type LoginInput,
  type SignupInput,
} from "./validation";

export interface AuthServiceDeps {
  teachers: TeacherRepository;
  sessions: SessionRepository;
  passwordHasher: PasswordHasher;
  sessionTokens: SessionTokenService;
  clock: Clock;
  /**
   * A real argon2id hash of a value nobody knows. Verified against when an
   * email has no account, so the unknown-email path costs the same as the
   * wrong-password path instead of returning early.
   */
  decoyPasswordHash: string;
}

/** What the caller needs to set a cookie. The token is returned exactly once. */
export interface IssuedSession {
  teacher: Teacher;
  token: string;
  expiresAt: Date;
}

export interface AuthenticatedTeacher {
  teacher: Teacher;
  session: Session;
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async signup(input: SignupInput): Promise<IssuedSession> {
    const valid = validateSignup(input);

    // Always hash, even when we already know the address is taken, so that
    // signup's response time does not distinguish "taken" from "available".
    const passwordHash = await this.deps.passwordHasher.hash(valid.password);

    const existing = await this.deps.teachers.findCredentialsByEmail(valid.email);
    if (existing !== null) throw new InvalidCredentialsError();

    const teacher = await this.deps.teachers.create({
      email: valid.email,
      passwordHash,
      displayName: valid.displayName,
      locale: valid.locale,
    });
    // `null` means the unique index rejected the insert — two signups for the
    // same address raced. Same error as above: still no enumeration signal.
    if (teacher === null) throw new InvalidCredentialsError();

    return this.issueSession(teacher);
  }

  async login(input: LoginInput): Promise<IssuedSession> {
    const valid = validateLogin(input);

    const credentials = await this.deps.teachers.findCredentialsByEmail(valid.email);
    if (credentials === null) {
      // Burn a verification against the decoy so an unknown address and a known
      // address with a bad password take comparable time, then fail identically.
      await this.deps.passwordHasher.verify(this.deps.decoyPasswordHash, valid.password);
      throw new InvalidCredentialsError();
    }

    const ok = await this.deps.passwordHasher.verify(credentials.passwordHash, valid.password);
    if (!ok) throw new InvalidCredentialsError();

    return this.issueSession(credentials.teacher);
  }

  /**
   * Resolve the teacher behind a cookie token, or `null`. The repository
   * applies the revoked/expired filter, so a token that reaches here and comes
   * back non-null is live.
   */
  async resolveSession(token: string): Promise<AuthenticatedTeacher | null> {
    if (token.length === 0) return null;
    const now = this.deps.clock.now();
    const tokenHash = this.deps.sessionTokens.hash(token);

    const session = await this.deps.sessions.findActiveByTokenHash(tokenHash, now);
    if (session === null) return null;

    const teacher = await this.deps.teachers.findById(session.teacherId);
    if (teacher === null) return null;

    await this.deps.sessions.touch({ sessionId: session.id, teacherId: session.teacherId, at: now });

    return { teacher, session };
  }

  /**
   * Revoke a session server-side. Takes the teacher id the middleware already
   * resolved and refuses to act if the token names a different workspace.
   */
  async logout(token: string, teacherId: TeacherId): Promise<void> {
    const now = this.deps.clock.now();
    const tokenHash = this.deps.sessionTokens.hash(token);

    const session = await this.deps.sessions.findActiveByTokenHash(tokenHash, now);
    if (session === null) return; // already gone; logout is idempotent
    if (session.teacherId !== teacherId) throw new SessionOwnershipError();

    await this.deps.sessions.revoke({ sessionId: session.id, teacherId, revokedAt: now });
  }

  private async issueSession(teacher: Teacher): Promise<IssuedSession> {
    const now = this.deps.clock.now();
    const token = this.deps.sessionTokens.generate();
    const expiresAt = computeSessionExpiry(now);

    await this.deps.sessions.create({
      teacherId: teacher.id,
      tokenHash: this.deps.sessionTokens.hash(token),
      createdAt: now,
      expiresAt,
    });

    return { teacher, token, expiresAt };
  }
}
