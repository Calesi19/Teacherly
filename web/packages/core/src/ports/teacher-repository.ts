import type { NewTeacher, Teacher, TeacherCredentials, TeacherId } from "../domain/teacher";

export interface TeacherRepository {
  /**
   * Look up a teacher by id. This is the only lookup that is allowed to take an
   * id that did not come from the session middleware.
   */
  findById(teacherId: TeacherId): Promise<Teacher | null>;

  /**
   * Look up credentials by email. The implementation is responsible for
   * normalizing the address before matching — callers must not have to remember.
   */
  findCredentialsByEmail(email: string): Promise<TeacherCredentials | null>;

  /**
   * Insert a teacher. Returns `null` when the email is already taken, rather
   * than throwing a driver-specific unique-violation error, so that the domain
   * service can collapse that case into the generic credential failure.
   */
  create(input: NewTeacher): Promise<Teacher | null>;
}
