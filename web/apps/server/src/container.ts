import { AuthService, GradebookService, SchoolService, systemClock } from "@teacherly/core";
import {
  DrizzleAssessmentRepository,
  DrizzleClassRepository,
  DrizzleGradeRepository,
  DrizzleSessionRepository,
  DrizzleStudentRepository,
  DrizzleTeacherRepository,
  createDatabase,
  type DatabaseHandle,
} from "@teacherly/db";

import { Argon2PasswordHasher, createDecoyPasswordHash } from "./adapters/argon2-password-hasher";
import { Sha256SessionTokenService } from "./adapters/sha256-session-token-service";

export interface Container {
  auth: AuthService;
  school: SchoolService;
  gradebook: GradebookService;
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

  // The four teacher-owned repositories, built once and shared by both
  // services. `SchoolService` writes through them and `GradebookService` reads
  // through them; neither can reach the database any other way, and every
  // method on all four demands a `TeacherId` it cannot invent.
  const repositories = {
    classes: new DrizzleClassRepository(database.db),
    students: new DrizzleStudentRepository(database.db),
    assessments: new DrizzleAssessmentRepository(database.db),
    grades: new DrizzleGradeRepository(database.db),
  };

  return {
    auth,
    school: new SchoolService(repositories),
    // Takes the same repositories rather than taking `SchoolService`: the
    // gradebook's lookups go through its own internal `SchoolService` so that
    // "not found and not yours are the same 404" is decided once, and sharing
    // the repository instances keeps a single connection pool behind both.
    gradebook: new GradebookService(repositories),
    database,
    close: () => database.close(),
  };
}
