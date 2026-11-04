import { describe, expect, it } from "vitest";

import { authed, makeFixture, signUp, type Fixture } from "../testing/fixtures";

/**
 * Route-level tests for classes, students, assessments, grades and the grading
 * reads, over the real `createApp` with in-memory repositories.
 *
 * Two things are being established here, and the second is the one that
 * matters most:
 *
 *   1. Each route does what it says — status codes, response shapes, the
 *      validation contract, and the grading numbers arriving unrounded-twice.
 *   2. **No route will serve one teacher another teacher's data.** That is
 *      checked by enumerating every registered route and driving each one with
 *      teacher A's cookie against teacher B's ids. The enumeration is derived
 *      from Hono's own route table and asserted to be complete, so a route
 *      added later without an isolation case fails this suite rather than
 *      shipping unprotected.
 */

/* ===========================================================================
 * Helpers: build a workspace through the API, as a client would.
 * ======================================================================== */

interface Workspace {
  cookie: string;
  classId: string;
  studentId: string;
  otherStudentId: string;
  assessmentId: string;
}

/**
 * A parsed response body.
 *
 * `unknown` rather than a named shape: each call site asserts the shape it
 * cares about, and a helper that claimed to know the shape would be asserting
 * it in the one place no test is looking.
 */
async function json(response: Response): Promise<unknown> {
  return (await response.json()) as unknown;
}

/**
 * A class with two students and one 100-point assessment, created through the
 * HTTP API rather than by reaching into the store — so the ids a test holds are
 * ids the app issued, and the setup is itself a happy-path assertion.
 */
async function seedWorkspace(
  fixture: Fixture,
  email: string,
  options: { name?: string; maxScore?: number } = {},
): Promise<Workspace> {
  const cookie = await signUp(fixture, email);
  const name = options.name ?? "Period 1";

  const classResponse = await fixture.app.request(
    authed(cookie, "POST", "/api/classes", { name, courseName: "Algebra I" }),
  );
  expect(classResponse.status).toBe(201);
  const classId = ((await json(classResponse)) as { class: { id: string } }).class.id;

  const studentIds: string[] = [];
  for (const studentName of ["Ada Lovelace", "Alan Turing"]) {
    const response = await fixture.app.request(
      authed(cookie, "POST", `/api/classes/${classId}/students`, { name: studentName }),
    );
    expect(response.status).toBe(201);
    studentIds.push(((await json(response)) as { student: { id: string } }).student.id);
  }

  const assessmentResponse = await fixture.app.request(
    authed(cookie, "POST", `/api/classes/${classId}/assessments`, {
      name: "Unit 1 Exam",
      maxScore: options.maxScore ?? 100,
      assignedOn: "2026-02-03",
    }),
  );
  expect(assessmentResponse.status).toBe(201);
  const assessmentId = ((await json(assessmentResponse)) as { assessment: { id: string } })
    .assessment.id;

  const [studentId, otherStudentId] = studentIds;
  if (studentId === undefined || otherStudentId === undefined) {
    throw new Error("seed failed to create two students");
  }
  return { cookie, classId, studentId, otherStudentId, assessmentId };
}

/* ===========================================================================
 * Classes
 * ======================================================================== */

describe("classes", () => {
  it("creates a class with the default 90/80/70/60 scale", async () => {
    const fixture = makeFixture();
    const cookie = await signUp(fixture, "teacher@school.test");

    const response = await fixture.app.request(
      authed(cookie, "POST", "/api/classes", { name: "Period 1", courseName: "Algebra I" }),
    );

    expect(response.status).toBe(201);
    const body = (await json(response)) as {
      class: { name: string; courseName: string; gradingScale: unknown };
    };
    expect(body.class.name).toBe("Period 1");
    expect(body.class.courseName).toBe("Algebra I");
    // The user's decision: 90/80/70/60 is what a new class gets, not a rule.
    expect(body.class.gradingScale).toEqual({ a: 90, b: 80, c: 70, d: 60 });
  });

  it("accepts a per-class scale on creation", async () => {
    const fixture = makeFixture();
    const cookie = await signUp(fixture, "teacher@school.test");

    const response = await fixture.app.request(
      authed(cookie, "POST", "/api/classes", {
        name: "AP Calculus",
        courseName: "Calculus BC",
        gradingScale: { a: 93, b: 85, c: 77, d: 70 },
      }),
    );

    expect(response.status).toBe(201);
    expect(((await json(response)) as { class: { gradingScale: unknown } }).class.gradingScale)
      .toEqual({ a: 93, b: 85, c: 77, d: 70 });
  });

  it("rejects a scale whose bands are not descending, naming the field", async () => {
    const fixture = makeFixture();
    const cookie = await signUp(fixture, "teacher@school.test");

    const response = await fixture.app.request(
      authed(cookie, "POST", "/api/classes", {
        name: "Broken",
        courseName: "Nonsense",
        gradingScale: { a: 80, b: 90, c: 70, d: 60 },
      }),
    );

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: {
        code: "validation_failed",
        issues: [{ field: "gradingScale", code: "not_descending" }],
      },
    });
  });

  it("rejects a blank name", async () => {
    const fixture = makeFixture();
    const cookie = await signUp(fixture, "teacher@school.test");

    const response = await fixture.app.request(
      authed(cookie, "POST", "/api/classes", { name: "   ", courseName: "Algebra I" }),
    );

    expect(response.status).toBe(400);
    const body = (await json(response)) as { error: { issues: unknown } };
    expect(body.error.issues).toEqual([{ field: "name", code: "required" }]);
  });

  it("lists only the calling teacher's classes", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test", { name: "A's class" });
    await seedWorkspace(fixture, "b@school.test", { name: "B's class" });

    const response = await fixture.app.request(authed(a.cookie, "GET", "/api/classes"));

    expect(response.status).toBe(200);
    const body = (await json(response)) as { classes: { id: string; name: string }[] };
    expect(body.classes).toHaveLength(1);
    expect(body.classes[0]?.name).toBe("A's class");
  });

  it("patches one field and leaves the others alone", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "PATCH", `/api/classes/${a.classId}`, { name: "Period 2" }),
    );

    expect(response.status).toBe(200);
    const body = (await json(response)) as {
      class: { name: string; courseName: string };
    };
    expect(body.class.name).toBe("Period 2");
    expect(body.class.courseName).toBe("Algebra I");
  });

  it("rejects an empty update rather than reporting success", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "PATCH", `/api/classes/${a.classId}`, {}),
    );

    expect(response.status).toBe(400);
    const body = (await json(response)) as { error: { issues: unknown } };
    expect(body.error.issues).toEqual([{ field: "body", code: "empty_update" }]);
  });

  it("soft-deletes a class and its students and assessments with it", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const deleted = await fixture.app.request(
      authed(a.cookie, "DELETE", `/api/classes/${a.classId}`),
    );
    expect(deleted.status).toBe(204);

    // The class is gone from every read...
    expect(
      (await fixture.app.request(authed(a.cookie, "GET", `/api/classes/${a.classId}`))).status,
    ).toBe(404);
    // ...and so are the rows under it, rather than being left live in a
    // deleted class — the cascade the repository does in one transaction.
    expect(
      (await fixture.app.request(authed(a.cookie, "GET", `/api/students/${a.studentId}`))).status,
    ).toBe(404);
    expect(
      (await fixture.app.request(authed(a.cookie, "GET", `/api/assessments/${a.assessmentId}`)))
        .status,
    ).toBe(404);
  });

  it("answers 404 for an unknown class id, the same as for someone else's", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "GET", "/api/classes/not-a-real-id"),
    );
    expect(response.status).toBe(404);
    // The code names the table the caller asked about, which they already
    // know from the endpoint they called. It does not reveal whether the id
    // exists for someone else — see the cross-teacher suite, which pins that
    // by comparing this response against a real-but-foreign id's.
    expect(await json(response)).toEqual({ error: { code: "class_not_found" } });
  });
});

/* ===========================================================================
 * Students and assessments
 * ======================================================================== */

describe("students", () => {
  it("creates a student in the named class", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${a.classId}/students`, {
        name: "Grace Hopper",
        studentNumber: "42",
      }),
    );

    expect(response.status).toBe(201);
    const body = (await json(response)) as {
      student: { name: string; studentNumber: string | null; classId: string };
    };
    expect(body.student).toMatchObject({
      name: "Grace Hopper",
      studentNumber: "42",
      classId: a.classId,
    });
  });

  it("lists a class's roster", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/classes/${a.classId}/students`),
    );

    expect(response.status).toBe(200);
    expect(((await json(response)) as { students: unknown[] }).students).toHaveLength(2);
  });

  it("clears a student number with an explicit null", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    await fixture.app.request(
      authed(a.cookie, "PATCH", `/api/students/${a.studentId}`, { studentNumber: "7" }),
    );

    const response = await fixture.app.request(
      authed(a.cookie, "PATCH", `/api/students/${a.studentId}`, { studentNumber: null }),
    );

    expect(response.status).toBe(200);
    expect(((await json(response)) as { student: { studentNumber: null } }).student.studentNumber)
      .toBeNull();
  });

  it("never serializes the teacher id", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/students/${a.studentId}`),
    );

    // The workspace key has no business in a browser cache or a log.
    expect(await response.text()).not.toContain("teacherId");
  });
});

describe("assessments", () => {
  it("creates an assessment with a date and a max score", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${a.classId}/assessments`, {
        name: "Quiz 2",
        maxScore: 10,
        assignedOn: "2026-02-10",
      }),
    );

    expect(response.status).toBe(201);
    expect(((await json(response)) as { assessment: unknown }).assessment).toMatchObject({
      name: "Quiz 2",
      maxScore: 10,
      assignedOn: "2026-02-10",
    });
  });

  it("rejects a zero max score", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${a.classId}/assessments`, {
        name: "Pointless",
        maxScore: 0,
        assignedOn: "2026-02-10",
      }),
    );

    // A zero-point assessment contributes nothing to any denominator while
    // looking like a graded item — a divide-by-zero waiting to happen.
    expect(response.status).toBe(400);
    const body = (await json(response)) as { error: { issues: unknown } };
    expect(body.error.issues).toEqual([{ field: "maxScore", code: "out_of_range" }]);
  });

  it("rejects a malformed date", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${a.classId}/assessments`, {
        name: "Quiz",
        maxScore: 10,
        assignedOn: "03/02/2026",
      }),
    );

    expect(response.status).toBe(400);
    const body = (await json(response)) as { error: { issues: unknown } };
    expect(body.error.issues).toEqual([{ field: "assignedOn", code: "invalid_format" }]);
  });

  it("refuses to create an assessment in another teacher's class", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    const b = await seedWorkspace(fixture, "b@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${b.classId}/assessments`, {
        name: "Injected",
        maxScore: 10,
        assignedOn: "2026-02-10",
      }),
    );

    // Reported as a missing class — which is what A named, and says nothing
    // about whether that class exists for anyone else.
    expect(response.status).toBe(404);
    // And nothing was written into B's class.
    const bList = await fixture.app.request(
      authed(b.cookie, "GET", `/api/classes/${b.classId}/assessments`),
    );
    expect(((await json(bList)) as { assessments: unknown[] }).assessments).toHaveLength(1);
  });
});

/* ===========================================================================
 * Grades
 * ======================================================================== */

describe("grades", () => {
  it("records a score, then replaces it on a repeated PUT", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    const path = `/api/assessments/${a.assessmentId}/grades/${a.studentId}`;

    const first = await fixture.app.request(
      authed(a.cookie, "PUT", path, { score: 80, exempt: false, late: false }),
    );
    expect(first.status).toBe(200);
    expect(((await json(first)) as { grade: unknown }).grade).toMatchObject({ score: 80 });

    // PUT is idempotent in state: the same pair still has exactly one grade.
    const second = await fixture.app.request(
      authed(a.cookie, "PUT", path, { score: 91, exempt: false, late: true }),
    );
    expect(second.status).toBe(200);
    expect(((await json(second)) as { grade: unknown }).grade).toMatchObject({
      score: 91,
      late: true,
    });

    const list = await fixture.app.request(
      authed(a.cookie, "GET", `/api/assessments/${a.assessmentId}/grades`),
    );
    expect(((await json(list)) as { grades: unknown[] }).grades).toHaveLength(1);
  });

  it("keeps a null score distinct from a zero", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const zero = await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 0,
        exempt: false,
        late: false,
      }),
    );
    expect(((await json(zero)) as { grade: { score: number } }).grade.score).toBe(0);

    const unscored = await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.otherStudentId}`, {
        score: null,
        exempt: false,
        late: true,
      }),
    );
    // A row that records `late` before marking. Not a zero.
    expect(((await json(unscored)) as { grade: { score: null } }).grade.score).toBeNull();
  });

  it("clears a grade back to ungraded by removing the row", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    const path = `/api/assessments/${a.assessmentId}/grades/${a.studentId}`;
    await fixture.app.request(authed(a.cookie, "PUT", path, { score: 50, exempt: false, late: false }));

    const cleared = await fixture.app.request(authed(a.cookie, "DELETE", path));
    expect(cleared.status).toBe(204);

    const list = await fixture.app.request(
      authed(a.cookie, "GET", `/api/assessments/${a.assessmentId}/grades`),
    );
    expect(((await json(list)) as { grades: unknown[] }).grades).toHaveLength(0);

    // Clearing again is a 404: there is no row, which is a different answer
    // from "cleared it".
    expect((await fixture.app.request(authed(a.cookie, "DELETE", path))).status).toBe(404);
  });

  it("rejects a score with more precision than the column holds", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 33.333,
        exempt: false,
        late: false,
      }),
    );

    // Caught as a 400 that names the field rather than reaching the exact
    // arithmetic and coming back as a 500.
    expect(response.status).toBe(400);
    const body = (await json(response)) as { error: { issues: unknown } };
    expect(body.error.issues).toEqual([{ field: "score", code: "too_precise" }]);
  });

  it("refuses a grade joining a student and an assessment from different classes", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    // A second class of the *same* teacher, with its own student.
    const other = await fixture.app.request(
      authed(a.cookie, "POST", "/api/classes", { name: "Period 3", courseName: "Geometry" }),
    );
    const otherClassId = ((await json(other)) as { class: { id: string } }).class.id;
    const outsider = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${otherClassId}/students`, { name: "Outsider" }),
    );
    const outsiderId = ((await json(outsider)) as { student: { id: string } }).student.id;

    const response = await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${outsiderId}`, {
        score: 10,
        exempt: false,
        late: false,
      }),
    );

    // Both sides are this teacher's, so no foreign key would object — this is
    // the cross-class check the schema cannot make. A grade only means
    // something when the student is in the assessment's class.
    expect(response.status).toBe(404);
  });
});

/* ===========================================================================
 * The grading reads — the numbers, over HTTP.
 * ======================================================================== */

describe("the gradebook reads", () => {
  it("returns each student's percentage and letter for a class", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    // A 100-point exam and a 10-point quiz, so the weighting is visible.
    const quizResponse = await fixture.app.request(
      authed(a.cookie, "POST", `/api/classes/${a.classId}/assessments`, {
        name: "Quiz 1",
        maxScore: 10,
        assignedOn: "2026-02-10",
      }),
    );
    const quizId = ((await json(quizResponse)) as { assessment: { id: string } }).assessment.id;

    // Ada: 50/100 on the exam, 10/10 on the quiz.
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 50,
        exempt: false,
        late: false,
      }),
    );
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${quizId}/grades/${a.studentId}`, {
        score: 10,
        exempt: false,
        late: false,
      }),
    );
    // Alan: exam exempt, quiz 9/10.
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.otherStudentId}`, {
        score: null,
        exempt: true,
        late: false,
      }),
    );
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${quizId}/grades/${a.otherStudentId}`, {
        score: 9,
        exempt: false,
        late: false,
      }),
    );

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/classes/${a.classId}/gradebook`),
    );

    expect(response.status).toBe(200);
    const body = (await json(response)) as {
      grades: { studentId: string; percentage: number | null; letter: string | null }[];
    };

    // Ada: 60 / 110 = 54.5454...% -> 54.55%, an F. Points, not a mean of
    // percentages — a mean would have been (50% + 100%) / 2 = 75%, a C.
    expect(body.grades[0]).toMatchObject({ percentage: 54.55, letter: "F" });
    // Alan: the exam is exempt, so only the quiz counts. 9 / 10 = 90%, an A —
    // the exam's 100 points are out of the denominator entirely.
    expect(body.grades[1]).toMatchObject({ percentage: 90, letter: "A" });
  });

  it("reports no percentage, rather than 0%, for a fully exempt student", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 0,
        exempt: true,
        late: false,
      }),
    );

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/classes/${a.classId}/students/${a.studentId}/grade`),
    );

    expect(response.status).toBe(200);
    const body = (await json(response)) as {
      grade: { percentage: null; letter: null; totals: { exempt: number; counted: number } };
    };
    // The desktop app's PDF prints 0% and an F here. This is the single most
    // visible behavioural change in this chunk.
    expect(body.grade.percentage).toBeNull();
    expect(body.grade.letter).toBeNull();
    expect(body.grade.totals).toMatchObject({ counted: 0, exempt: 1 });
  });

  it("rounds the letter off the rounded percentage, once", async () => {
    const fixture = makeFixture();
    // A 200-point exam: 179.99 / 200 = 89.995%.
    const a = await seedWorkspace(fixture, "a@school.test", { maxScore: 200 });
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 179.99,
        exempt: false,
        late: false,
      }),
    );

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/classes/${a.classId}/students/${a.studentId}/grade`),
    );

    const body = (await json(response)) as { grade: { percentage: number; letter: string } };
    // 89.995 -> 90.00 -> A. The displayed number and the letter agree because
    // there is only one number. The old PDF showed "89.9" next to a "B".
    expect(body.grade.percentage).toBe(90);
    expect(body.grade.letter).toBe("A");
  });

  it("honours the class's own cutoffs", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    await fixture.app.request(
      authed(a.cookie, "PATCH", `/api/classes/${a.classId}`, {
        gradingScale: { a: 93, b: 85, c: 77, d: 70 },
      }),
    );
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 91,
        exempt: false,
        late: false,
      }),
    );

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/classes/${a.classId}/students/${a.studentId}/grade`),
    );

    const body = (await json(response)) as { grade: { percentage: number; letter: string } };
    // 91% is an A on 90/80/70/60 and a B on this class's scale.
    expect(body.grade.percentage).toBe(91);
    expect(body.grade.letter).toBe("B");
  });

  it("returns the class average and every student's result for an assessment", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.studentId}`, {
        score: 100,
        exempt: false,
        late: false,
      }),
    );
    await fixture.app.request(
      authed(a.cookie, "PUT", `/api/assessments/${a.assessmentId}/grades/${a.otherStudentId}`, {
        score: 50,
        exempt: false,
        late: false,
      }),
    );

    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/assessments/${a.assessmentId}/results`),
    );

    expect(response.status).toBe(200);
    const body = (await json(response)) as {
      average: { percentage: number; letter: string };
      results: { percentage: number | null; status: string }[];
    };
    // 150 / 200 = 75%, and the individual percentages are 100 and 50 — the
    // same formula, so the average and the rows cannot disagree.
    expect(body.average).toMatchObject({ percentage: 75, letter: "C" });
    expect(body.results.map((r) => r.percentage)).toEqual([100, 50]);
  });

  it("refuses to grade a student against a class they are not in", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");
    const other = await fixture.app.request(
      authed(a.cookie, "POST", "/api/classes", { name: "Period 3", courseName: "Geometry" }),
    );
    const otherClassId = ((await json(other)) as { class: { id: string } }).class.id;

    // The student exists and is this teacher's, but belongs to another class.
    const response = await fixture.app.request(
      authed(a.cookie, "GET", `/api/classes/${otherClassId}/students/${a.studentId}/grade`),
    );

    // 404 rather than a confident "0 counted" against the wrong class.
    expect(response.status).toBe(404);
  });
});

/* ===========================================================================
 * Cross-teacher isolation, over every route.
 * ======================================================================== */

/**
 * Every route this chunk adds, as (method, path template, body).
 *
 * `:class`, `:student` and `:assessment` are substituted with **teacher B's**
 * ids, and each request is sent with **teacher A's** cookie. `expect` is the
 * status A must receive.
 *
 * Bodies are deliberately valid. An invalid body would 400 before the lookup
 * happened, and the test would pass while proving nothing about scoping.
 */
const CROSS_TEACHER_CASES: {
  method: string;
  path: string;
  body?: unknown;
  expect: number;
  note: string;
}[] = [
  {
    method: "GET",
    path: "/api/classes/:class",
    expect: 404,
    note: "read another teacher's class",
  },
  {
    method: "PATCH",
    path: "/api/classes/:class",
    body: { name: "Hijacked" },
    expect: 404,
    note: "rename another teacher's class",
  },
  {
    method: "DELETE",
    path: "/api/classes/:class",
    expect: 404,
    note: "delete another teacher's class",
  },
  {
    method: "POST",
    path: "/api/classes/:class/students",
    body: { name: "Injected Student" },
    expect: 404,
    note: "add a student to another teacher's class",
  },
  {
    method: "GET",
    path: "/api/classes/:class/students",
    expect: 404,
    note: "list another teacher's roster",
  },
  {
    method: "GET",
    path: "/api/students/:student",
    expect: 404,
    note: "read another teacher's student",
  },
  {
    method: "PATCH",
    path: "/api/students/:student",
    body: { name: "Hijacked" },
    expect: 404,
    note: "rename another teacher's student",
  },
  {
    method: "DELETE",
    path: "/api/students/:student",
    expect: 404,
    note: "delete another teacher's student",
  },
  {
    method: "POST",
    path: "/api/classes/:class/assessments",
    body: { name: "Injected", maxScore: 10, assignedOn: "2026-03-01" },
    expect: 404,
    note: "add an assessment to another teacher's class",
  },
  {
    method: "GET",
    path: "/api/classes/:class/assessments",
    expect: 404,
    note: "list another teacher's assessments",
  },
  {
    method: "GET",
    path: "/api/assessments/:assessment",
    expect: 404,
    note: "read another teacher's assessment",
  },
  {
    method: "PATCH",
    path: "/api/assessments/:assessment",
    body: { name: "Hijacked" },
    expect: 404,
    note: "rename another teacher's assessment",
  },
  {
    method: "DELETE",
    path: "/api/assessments/:assessment",
    expect: 404,
    note: "delete another teacher's assessment",
  },
  {
    method: "PUT",
    path: "/api/assessments/:assessment/grades/:student",
    body: { score: 0, exempt: false, late: false },
    expect: 404,
    note: "write a grade into another teacher's gradebook",
  },
  {
    method: "DELETE",
    path: "/api/assessments/:assessment/grades/:student",
    expect: 404,
    note: "clear a grade in another teacher's gradebook",
  },
  {
    method: "GET",
    path: "/api/assessments/:assessment/grades",
    expect: 404,
    note: "read another teacher's grades",
  },
  {
    method: "GET",
    path: "/api/classes/:class/gradebook",
    expect: 404,
    note: "read another teacher's gradebook",
  },
  {
    method: "GET",
    path: "/api/classes/:class/students/:student/grade",
    expect: 404,
    note: "read another teacher's student's grade",
  },
  {
    method: "GET",
    path: "/api/assessments/:assessment/results",
    expect: 404,
    note: "read another teacher's assessment results",
  },
  // The two collection routes name no id, so there is nothing to cross. They
  // are covered here anyway, because "scoped to the session" is still the
  // property under test: the list must not include B's rows, and the create
  // must land in A's workspace rather than anywhere it was told to.
  {
    method: "GET",
    path: "/api/classes",
    expect: 200,
    note: "list classes — must contain only A's",
  },
  {
    method: "POST",
    path: "/api/classes",
    body: { name: "A's new class", courseName: "Chemistry" },
    expect: 201,
    note: "create a class — lands in A's workspace",
  },
];

function substitute(path: string, workspace: Workspace): string {
  return path
    .replace(":class", workspace.classId)
    .replace(":assessment", workspace.assessmentId)
    .replace(":student", workspace.studentId);
}

/**
 * Ids that belong to nobody, for the control request.
 *
 * Shaped like the real thing but never issued, so a route cannot tell them
 * apart from another teacher's ids by inspection — only by looking the row up,
 * which is the thing under test.
 */
const NOBODYS_IDS: Workspace = {
  cookie: "",
  classId: "class-does-not-exist",
  studentId: "student-does-not-exist",
  otherStudentId: "student-does-not-exist",
  assessmentId: "assessment-does-not-exist",
};

describe("cross-teacher isolation", () => {
  /**
   * The completeness guard.
   *
   * Hono's own route table is the source of truth for what the API serves, so
   * the enumeration above is checked against it rather than against a
   * hand-maintained count. A route added to `school-routes.ts` without a case
   * here fails this test with its own name — which is the gap this is
   * protecting against, since an unprotected route is invisible otherwise.
   */
  it("enumerates every route this chunk adds", async () => {
    const fixture = makeFixture();

    // The auth and health routes predate this chunk and are covered by
    // `app.test.ts`; everything else under /api is this chunk's and must have
    // an isolation case.
    const PRE_EXISTING = new Set([
      "GET /api/health",
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "GET /api/me",
    ]);

    const registered = [
      ...new Set(
        fixture.app.routes
          .filter((route) => route.method !== "ALL")
          .map((route) => `${route.method} ${route.path}`),
      ),
    ].filter((route) => !PRE_EXISTING.has(route));

    const covered = new Set(
      CROSS_TEACHER_CASES.map(
        (testCase) =>
          `${testCase.method} ${testCase.path
            .replace(":class", ":classId")
            .replace(":assessment", ":assessmentId")
            .replace(":student", ":studentId")}`,
      ),
    );

    const uncovered = registered.filter((route) => !covered.has(route));
    expect(uncovered).toEqual([]);
    // And the enumeration is not padded with routes that do not exist.
    expect(registered).toHaveLength(CROSS_TEACHER_CASES.length);
  });

  for (const testCase of CROSS_TEACHER_CASES) {
    it(`denies A: ${testCase.method} ${testCase.path} — ${testCase.note}`, async () => {
      const fixture = makeFixture();
      const a = await seedWorkspace(fixture, "a@school.test", { name: "A's class" });
      const b = await seedWorkspace(fixture, "b@school.test", { name: "B's class" });

      // Give B a recorded grade, so the grade routes have a real row to target
      // rather than passing because nothing was there.
      await fixture.app.request(
        authed(b.cookie, "PUT", `/api/assessments/${b.assessmentId}/grades/${b.studentId}`, {
          score: 77,
          exempt: false,
          late: false,
        }),
      );

      const response = await fixture.app.request(
        authed(a.cookie, testCase.method, substitute(testCase.path, b), testCase.body),
      );

      expect(response.status).toBe(testCase.expect);

      if (testCase.expect === 404) {
        // A 404 and not a 403 — and, more than that, *the same* 404 the route
        // gives for an id that belongs to nobody at all.
        //
        // This is the property that matters, and asserting a fixed error code
        // would not have caught its absence: if a real-but-someone-else's id
        // produced any different status, code or body from a fabricated one,
        // the difference is an oracle. A caller could walk the id space and
        // learn which classes exist across every teacher's workspace. So the
        // two responses are compared byte for byte.
        const control = await fixture.app.request(
          authed(a.cookie, testCase.method, substitute(testCase.path, NOBODYS_IDS), testCase.body),
        );

        expect(control.status).toBe(response.status);
        expect(await control.text()).toBe(await response.text());
        // And it really is a not-found, rather than both being some other
        // failure that happens to match.
        expect(response.status).toBe(404);
      }

      // A's own view never contains B's class, whatever the call did.
      const aClasses = await fixture.app.request(authed(a.cookie, "GET", "/api/classes"));
      const names = ((await json(aClasses)) as { classes: { name: string }[] }).classes.map(
        (value) => value.name,
      );
      expect(names).not.toContain("B's class");
    });
  }

  it("leaves B's workspace byte-identical after A has attacked every route", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test", { name: "A's class" });
    const b = await seedWorkspace(fixture, "b@school.test", { name: "B's class" });
    await fixture.app.request(
      authed(b.cookie, "PUT", `/api/assessments/${b.assessmentId}/grades/${b.studentId}`, {
        score: 77,
        exempt: false,
        late: false,
      }),
    );

    /** B's whole workspace, as B sees it. */
    async function snapshot(): Promise<string> {
      const paths = [
        "/api/classes",
        `/api/classes/${b.classId}`,
        `/api/classes/${b.classId}/students`,
        `/api/classes/${b.classId}/assessments`,
        `/api/classes/${b.classId}/gradebook`,
        `/api/assessments/${b.assessmentId}/grades`,
        `/api/assessments/${b.assessmentId}/results`,
      ];
      const parts: string[] = [];
      for (const path of paths) {
        const response = await fixture.app.request(authed(b.cookie, "GET", path));
        parts.push(`${path} ${response.status} ${await response.text()}`);
      }
      return parts.join("\n");
    }

    const before = await snapshot();

    // Every write route in the table, fired at B's ids with A's cookie.
    for (const testCase of CROSS_TEACHER_CASES) {
      if (testCase.method === "GET") continue;
      await fixture.app.request(
        authed(a.cookie, testCase.method, substitute(testCase.path, b), testCase.body),
      );
    }

    // Not "the deletes 404'd", which a route could satisfy while still having
    // written: B's data is unchanged, read back through B's own session.
    expect(await snapshot()).toBe(before);
  });
});

/* ===========================================================================
 * Unauthenticated access.
 * ======================================================================== */

describe("authentication", () => {
  it("answers 401 on every school route without a session", async () => {
    const fixture = makeFixture();
    // A real workspace exists; the caller just has no cookie.
    const b = await seedWorkspace(fixture, "b@school.test");

    for (const testCase of CROSS_TEACHER_CASES) {
      const path = substitute(testCase.path, b);
      const headers: Record<string, string> =
        testCase.body === undefined ? {} : { "Content-Type": "application/json" };
      const response = await fixture.app.request(
        new Request(`http://localhost${path}`, {
          method: testCase.method,
          headers,
          ...(testCase.body === undefined ? {} : { body: JSON.stringify(testCase.body) }),
        }),
      );

      expect(
        { route: `${testCase.method} ${testCase.path}`, status: response.status },
        `${testCase.method} ${testCase.path} should require a session`,
      ).toEqual({ route: `${testCase.method} ${testCase.path}`, status: 401 });
    }
  });

  it("refuses a write that did not declare a JSON content type", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    // What a cross-site `<form enctype="text/plain">` post looks like: the
    // browser attaches the cookie and sends no preflight.
    const response = await fixture.app.request(
      new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { Cookie: a.cookie, "Content-Type": "text/plain" },
        body: JSON.stringify({ name: "CSRF", courseName: "CSRF" }),
      }),
    );

    expect(response.status).toBe(415);
    // And nothing was created.
    const list = await fixture.app.request(authed(a.cookie, "GET", "/api/classes"));
    expect(((await json(list)) as { classes: unknown[] }).classes).toHaveLength(1);
  });

  it("refuses a write marked cross-site by the browser", async () => {
    const fixture = makeFixture();
    const a = await seedWorkspace(fixture, "a@school.test");

    const response = await fixture.app.request(
      new Request("http://localhost/api/classes", {
        method: "POST",
        headers: {
          Cookie: a.cookie,
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        body: JSON.stringify({ name: "CSRF", courseName: "CSRF" }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
