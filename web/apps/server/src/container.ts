import { AuthService, systemClock } from "@teacherly/core";
import {
  DrizzleSessionRepository,
  DrizzleTeacherRepository,
  createDatabase,
  type DatabaseHandle,
} from "@teacherly/db";

import { Argon2PasswordHasher, createDecoyPasswordHash } from "./adapters/argon2-password-hasher";
import { Sha256SessionTokenService } from "./adapters/sha256-session-token-service";

export interface Container {
  auth: AuthService;
  database: DatabaseHandle;
  close(): Promise<void>;
}

/**
 * The only place the three layers meet: `packages/db` supplies the repository
 * implementations, this app supplies argon2id and SHA-256, and
 * `packages/core` receives them as ports. Core imports none of them.
 */
export async function createContainer(databaseUrl: string): Promise<Container> {
  const database = createDatabase(databaseUrl);
  const passwordHasher = new Argon2PasswordHasher();

  const auth = new AuthService({
    teachers: new DrizzleTeacherRepository(database.db),
    sessions: new DrizzleSessionRepository(database.db),
    passwordHasher,
    sessionTokens: new Sha256SessionTokenService(),
    clock: systemClock,
    // Minted once at startup: one argon2id hash, reused for every
    // unknown-email login so that path is not measurably faster.
    decoyPasswordHash: await createDecoyPasswordHash(passwordHasher),
  });

  return {
    auth,
    database,
    close: () => database.close(),
  };
}
