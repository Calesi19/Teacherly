import type { GradebookService, SchoolService, TeacherId } from "@teacherly/core";
import { Hono, type Context } from "hono";

import { toErrorResponse, unauthorized } from "../http/errors";
import { readJson } from "../http/json";
import { requireTeacher, type AppEnv } from "../http/session-middleware";
import {
  toAssessmentResponse,
  toAssessmentResultResponse,
  toClassResponse,
  toGradeResponse,
  toStudentClassGradeResponse,
  toStudentResponse,
  toTotalsResponse,
} from "./school-responses";

export interface SchoolRouteDeps {
  school: SchoolService;
  gradebook: GradebookService;
}

/**
 * Classes, students, assessments, grades, and the grading reads.
 *
 * The one rule every handler here follows, and the reason they are all in one
 * file where it can be checked by reading: **the teacher comes from
 * `teacherOf(c)` and from nowhere else.** No handler reads a teacher id from a
 * path parameter, a query string or a body, and none of them could — a
 * `TeacherId` is branded and cannot be minted outside `packages/db`, and
 * `pnpm check:core-purity` fails the build if a file under `apps/.../routes/`
 * so much as casts to one.
 *
 * Class and student ids *do* come from the path, and that is fine: every
 * repository method takes them beside a `TeacherId` and scopes on both, so an
 * id belonging to another teacher resolves to no row and the service raises
 * `NotFoundError` -> 404. There is no ownership check written in this file
 * because there is no way to skip one.
 *
 * Mounted behind `requireTeacher()` as a whole rather than route by route, so a
 * route added below cannot be the one that forgot the gate.
 */
export function schoolRoutes(deps: SchoolRouteDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", requireTeacher());

  /* ---------------------------------------------------------------- classes */

  app.post("/classes", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const created = await deps.school.createClass(teacherId, body);
      return c.json({ class: toClassResponse(created) }, 201);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/classes", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.listClasses(teacherId);
      return c.json({ classes: found.map(toClassResponse) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/classes/:classId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.getClass(teacherId, c.req.param("classId"));
      return c.json({ class: toClassResponse(found) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.patch("/classes/:classId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const updated = await deps.school.updateClass(teacherId, c.req.param("classId"), body);
      return c.json({ class: toClassResponse(updated) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.delete("/classes/:classId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      await deps.school.deleteClass(teacherId, c.req.param("classId"));
      return c.body(null, 204);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /* --------------------------------------------------------------- students */

  app.post("/classes/:classId/students", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const created = await deps.school.createStudent(teacherId, c.req.param("classId"), body);
      return c.json({ student: toStudentResponse(created) }, 201);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/classes/:classId/students", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.listStudents(teacherId, c.req.param("classId"));
      return c.json({ students: found.map(toStudentResponse) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/students/:studentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.getStudent(teacherId, c.req.param("studentId"));
      return c.json({ student: toStudentResponse(found) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.patch("/students/:studentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const updated = await deps.school.updateStudent(teacherId, c.req.param("studentId"), body);
      return c.json({ student: toStudentResponse(updated) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.delete("/students/:studentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      await deps.school.deleteStudent(teacherId, c.req.param("studentId"));
      return c.body(null, 204);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /* ------------------------------------------------------------ assessments */

  app.post("/classes/:classId/assessments", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const created = await deps.school.createAssessment(teacherId, c.req.param("classId"), body);
      return c.json({ assessment: toAssessmentResponse(created) }, 201);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/classes/:classId/assessments", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.listAssessments(teacherId, c.req.param("classId"));
      return c.json({ assessments: found.map(toAssessmentResponse) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/assessments/:assessmentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.getAssessment(teacherId, c.req.param("assessmentId"));
      return c.json({ assessment: toAssessmentResponse(found) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.patch("/assessments/:assessmentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const updated = await deps.school.updateAssessment(
        teacherId,
        c.req.param("assessmentId"),
        body,
      );
      return c.json({ assessment: toAssessmentResponse(updated) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.delete("/assessments/:assessmentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      await deps.school.deleteAssessment(teacherId, c.req.param("assessmentId"));
      return c.body(null, 204);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /* ----------------------------------------------------------------- grades */

  /**
   * `PUT`, not `POST`: there is at most one grade per (assessment, student),
   * it is the composite primary key, and the request is the full state of it.
   * Repeating the same `PUT` leaves the same grade, which is what a teacher
   * retyping a score in a spreadsheet-shaped UI will do.
   */
  app.put("/assessments/:assessmentId/grades/:studentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    const body = await readJson(c);
    if (body instanceof Response) return body;

    try {
      const saved = await deps.school.putGrade(
        teacherId,
        c.req.param("assessmentId"),
        c.req.param("studentId"),
        body,
      );
      return c.json({ grade: toGradeResponse(saved) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /**
   * Return a pair to ungraded. Distinct from `PUT {"score": null}`, which keeps
   * a row so it can still carry `late` or `exempt`; this removes the row. Both
   * are "ungraded" to the formula, and the difference is whether there is
   * anything else recorded about the pair.
   */
  app.delete("/assessments/:assessmentId/grades/:studentId", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      await deps.school.clearGrade(
        teacherId,
        c.req.param("assessmentId"),
        c.req.param("studentId"),
      );
      return c.body(null, 204);
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  app.get("/assessments/:assessmentId/grades", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const found = await deps.school.listGradesForAssessment(
        teacherId,
        c.req.param("assessmentId"),
      );
      return c.json({ grades: found.map(toGradeResponse) });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /* -------------------------------------------------------- grading reads  */

  /** Every student's percentage and letter for a class. */
  app.get("/classes/:classId/gradebook", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const book = await deps.gradebook.classGradebook(teacherId, c.req.param("classId"));
      return c.json({
        classId: book.classId,
        students: book.students.map(toStudentResponse),
        assessments: book.assessments.map(toAssessmentResponse),
        grades: book.grades.map(toStudentClassGradeResponse),
      });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /** One student's percentage and letter for a class. */
  app.get("/classes/:classId/students/:studentId/grade", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const result = await deps.gradebook.studentClassGrade(
        teacherId,
        c.req.param("classId"),
        c.req.param("studentId"),
      );
      return c.json({
        student: toStudentResponse(result.student),
        grade: toStudentClassGradeResponse(result.grade),
      });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  /** Every student's result on one assessment, plus the class average. */
  app.get("/assessments/:assessmentId/results", async (c) => {
    const teacherId = teacherOf(c);
    if (teacherId === null) return unauthorized(c);
    try {
      const book = await deps.gradebook.assessmentGradebook(
        teacherId,
        c.req.param("assessmentId"),
      );
      return c.json({
        assessment: toAssessmentResponse(book.assessment),
        students: book.students.map(toStudentResponse),
        average: {
          assessmentId: book.report.average.assessmentId,
          maxScore: book.report.average.maxScore,
          percentage: book.report.average.percentage,
          letter: book.report.average.letter,
          totals: toTotalsResponse(book.report.average.totals),
        },
        results: book.report.results.map(toAssessmentResultResponse),
      });
    } catch (error) {
      return toErrorResponse(c, error);
    }
  });

  return app;
}

/**
 * The session's teacher, or `null`.
 *
 * `requireTeacher()` already guarantees it is set, so the `null` branch is
 * unreachable; it exists to narrow the `Partial` in `AppEnv` without a
 * non-null assertion. An assertion would compile just as well and would be the
 * one line in this file capable of lying about where the teacher came from.
 */
function teacherOf(c: Context<AppEnv>): TeacherId | null {
  return c.get("teacherId") ?? null;
}
