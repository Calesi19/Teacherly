import { NotFoundError } from "../domain/errors";
import type { Assessment, AssessmentId, ClassId, Grade, Student, StudentId } from "../domain/school";
import type { TeacherId } from "../domain/teacher";
import {
  gradeClassForStudent,
  gradeClassForStudents,
  reportForAssessment,
  type AssessmentReport,
  type GradableAssessment,
  type GradableGrade,
  type StudentClassGrade,
} from "../grading";
import type {
  AssessmentRepository,
  ClassRepository,
  GradeRepository,
  StudentRepository,
} from "../ports/school-repository";
import { SchoolService } from "./school-service";

export interface GradebookServiceDeps {
  classes: ClassRepository;
  students: StudentRepository;
  assessments: AssessmentRepository;
  grades: GradeRepository;
}

/** A class's grades with the roster and assessments they were computed from. */
export interface ClassGradebook {
  classId: ClassId;
  students: Student[];
  assessments: Assessment[];
  grades: StudentClassGrade[];
}

/** One assessment's results, plus the roster they are keyed by. */
export interface AssessmentGradebook {
  assessment: Assessment;
  students: Student[];
  report: AssessmentReport;
}

/**
 * The read side of grading: fetch the scoped rows, hand them to the grading
 * module, return what it says.
 *
 * It contains no arithmetic. That is the point — `pnpm check:core-purity` fails
 * if this file so much as compares a percentage to 90, so the only way for a
 * number to get out of here is to have come from `packages/core/src/grading`.
 *
 * It reuses `SchoolService` for its lookups rather than calling the
 * repositories directly, so "not found and not yours are the same 404" is
 * decided in one place for reads and writes alike.
 */
export class GradebookService {
  private readonly school: SchoolService;

  constructor(private readonly deps: GradebookServiceDeps) {
    this.school = new SchoolService(deps);
  }

  /** Every student's percentage and letter for one class. */
  async classGradebook(teacherId: TeacherId, classId: ClassId): Promise<ClassGradebook> {
    const schoolClass = await this.school.getClass(teacherId, classId);
    const [students, assessments, grades] = await Promise.all([
      this.deps.students.listForClass(teacherId, classId),
      this.deps.assessments.listForClass(teacherId, classId),
      this.deps.grades.listForClass(teacherId, classId),
    ]);

    return {
      classId,
      students,
      assessments,
      grades: gradeClassForStudents(
        schoolClass.gradingScale,
        assessments.map(toGradable),
        grades.map(toGradableGrade),
        students.map((student) => student.id),
      ),
    };
  }

  /** One student's percentage and letter for one class. */
  async studentClassGrade(
    teacherId: TeacherId,
    classId: ClassId,
    studentId: StudentId,
  ): Promise<{ student: Student; assessments: Assessment[]; grade: StudentClassGrade }> {
    const schoolClass = await this.school.getClass(teacherId, classId);
    const student = await this.school.getStudent(teacherId, studentId);

    // The student exists in this workspace; they still have to be in *this*
    // class. Without this the endpoint would cheerfully grade a student against
    // another of the same teacher's classes and return a confident "0 counted".
    //
    // Reported as a missing student rather than a wrong class, because the
    // student is the resource the URL named inside the class it named — and
    // because it keeps "not in this class" indistinguishable from "no such
    // student", the same rule the repositories follow across teachers.
    if (student.classId !== classId) throw new NotFoundError("student");

    const [assessments, grades] = await Promise.all([
      this.deps.assessments.listForClass(teacherId, classId),
      this.deps.grades.listForClass(teacherId, classId),
    ]);

    return {
      student,
      assessments,
      grade: gradeClassForStudent(
        schoolClass.gradingScale,
        assessments.map(toGradable),
        grades.map(toGradableGrade),
        studentId,
      ),
    };
  }

  /** Every student's result on one assessment, plus the class average. */
  async assessmentGradebook(
    teacherId: TeacherId,
    assessmentId: AssessmentId,
  ): Promise<AssessmentGradebook> {
    const assessment = await this.school.getAssessment(teacherId, assessmentId);
    const schoolClass = await this.school.getClass(teacherId, assessment.classId);
    const [students, grades] = await Promise.all([
      this.deps.students.listForClass(teacherId, assessment.classId),
      this.deps.grades.listForAssessment(teacherId, assessmentId),
    ]);

    return {
      assessment,
      students,
      report: reportForAssessment(
        schoolClass.gradingScale,
        toGradable(assessment),
        grades.map(toGradableGrade),
        students.map((student) => student.id),
      ),
    };
  }
}

/** Entity -> the narrow shape the grading module accepts. */
function toGradable(assessment: Assessment): GradableAssessment {
  return { id: assessment.id, maxScore: assessment.maxScore };
}

function toGradableGrade(grade: Grade): GradableGrade {
  return {
    assessmentId: grade.assessmentId,
    studentId: grade.studentId,
    score: grade.score,
    exempt: grade.exempt,
    late: grade.late,
  };
}
