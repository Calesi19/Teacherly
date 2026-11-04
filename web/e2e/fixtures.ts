import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

export interface TeacherFixture {
  email: string;
  password: string;
  displayName: string;
}

/**
 * A fresh account per test run. The database is not reset between runs — using
 * a unique address is what keeps the suite re-runnable against a long-lived
 * local database, and is also the honest shape for later chunks where
 * isolation tests must not depend on an empty table.
 */
export function newTeacher(label: string): TeacherFixture {
  const id = randomUUID().slice(0, 8);
  return {
    email: `${label}-${id}@example.test`,
    // Comfortably over MIN_PASSWORD_LENGTH (12).
    password: `pw-${id}-correct-horse`,
    displayName: `${label} ${id}`,
  };
}

export async function signUp(page: Page, teacher: TeacherFixture): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill(teacher.displayName);
  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Password").fill(teacher.password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expectSignedIn(page, teacher);
}

export async function signIn(page: Page, teacher: TeacherFixture): Promise<void> {
  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Password").fill(teacher.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expectSignedIn(page, teacher);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
}

export async function expectSignedIn(page: Page, teacher: TeacherFixture): Promise<void> {
  await expect(page.getByTestId("signed-in-as")).toHaveText(`Signed in as ${teacher.displayName}`);
  await expect(page.getByTestId("teacher-email")).toHaveText(teacher.email);
}

/** What `GET /api/me` returns for the session cookie this context holds. */
export interface MeResponse {
  status: number;
  teacher?: { id: string; email: string; displayName: string; locale: string };
}

export async function fetchMe(context: BrowserContext): Promise<MeResponse> {
  // Goes through the context's own cookie jar, so it is the real request the
  // browser would make — not an out-of-band API call with a borrowed token.
  const response = await context.request.get("/api/me");
  if (!response.ok()) return { status: response.status() };
  const body = (await response.json()) as { teacher: MeResponse["teacher"] };
  return { status: response.status(), ...(body.teacher ? { teacher: body.teacher } : {}) };
}

/** An independent browser context: its own cookie jar, its own session. */
export async function newTeacherContext(
  browser: Browser,
  baseURL: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  return { context, page };
}

/* ===========================================================================
 * Teacher-owned data, through the real API over a real session cookie.
 * ======================================================================== */

/** The ids of one teacher's seeded workspace. */
export interface SeededWorkspace {
  classId: string;
  studentId: string;
  assessmentId: string;
}

/**
 * A class, a student, an assessment and a recorded grade, created through the
 * API using this context's own cookie.
 *
 * Built through HTTP rather than seeded into the database on purpose: the ids
 * the isolation test then attacks are ids the server issued to this session, so
 * a cross-teacher request is using genuinely valid identifiers rather than
 * guesses that would 404 whether or not scoping worked.
 */
export async function seedWorkspace(context: BrowserContext): Promise<SeededWorkspace> {
  const created = await context.request.post("/api/classes", {
    data: { name: "Period 1", courseName: "Algebra I" },
  });
  expect(created.ok()).toBe(true);
  const classId = ((await created.json()) as { class: { id: string } }).class.id;

  const student = await context.request.post(`/api/classes/${classId}/students`, {
    data: { name: "Ada Lovelace" },
  });
  expect(student.ok()).toBe(true);
  const studentId = ((await student.json()) as { student: { id: string } }).student.id;

  const assessment = await context.request.post(`/api/classes/${classId}/assessments`, {
    data: { name: "Unit 1 Exam", maxScore: 100, assignedOn: "2026-02-03" },
  });
  expect(assessment.ok()).toBe(true);
  const assessmentId = ((await assessment.json()) as { assessment: { id: string } }).assessment.id;

  const grade = await context.request.put(
    `/api/assessments/${assessmentId}/grades/${studentId}`,
    { data: { score: 77, exempt: false, late: false } },
  );
  expect(grade.ok()).toBe(true);

  return { classId, studentId, assessmentId };
}

/**
 * Every route that touches teacher-owned data, as a template over a workspace.
 *
 * This is the list the isolation test walks. A route added to the API without
 * being added here is the gap the test exists to close, so the server-side
 * suite (`apps/server/src/routes/school-routes.test.ts`) additionally checks
 * this enumeration against Hono's own route table and fails if one is missing.
 */
export function ownedDataRoutes(
  workspace: SeededWorkspace,
): { method: "get" | "post" | "patch" | "put" | "delete"; path: string; data?: unknown }[] {
  const { classId, studentId, assessmentId } = workspace;
  return [
    { method: "get", path: `/api/classes/${classId}` },
    { method: "patch", path: `/api/classes/${classId}`, data: { name: "Hijacked" } },
    { method: "delete", path: `/api/classes/${classId}` },
    { method: "post", path: `/api/classes/${classId}/students`, data: { name: "Injected" } },
    { method: "get", path: `/api/classes/${classId}/students` },
    { method: "get", path: `/api/students/${studentId}` },
    { method: "patch", path: `/api/students/${studentId}`, data: { name: "Hijacked" } },
    { method: "delete", path: `/api/students/${studentId}` },
    {
      method: "post",
      path: `/api/classes/${classId}/assessments`,
      data: { name: "Injected", maxScore: 10, assignedOn: "2026-03-01" },
    },
    { method: "get", path: `/api/classes/${classId}/assessments` },
    { method: "get", path: `/api/assessments/${assessmentId}` },
    { method: "patch", path: `/api/assessments/${assessmentId}`, data: { name: "Hijacked" } },
    { method: "delete", path: `/api/assessments/${assessmentId}` },
    {
      method: "put",
      path: `/api/assessments/${assessmentId}/grades/${studentId}`,
      data: { score: 0, exempt: false, late: false },
    },
    { method: "delete", path: `/api/assessments/${assessmentId}/grades/${studentId}` },
    { method: "get", path: `/api/assessments/${assessmentId}/grades` },
    { method: "get", path: `/api/classes/${classId}/gradebook` },
    { method: "get", path: `/api/classes/${classId}/students/${studentId}/grade` },
    { method: "get", path: `/api/assessments/${assessmentId}/results` },
  ];
}

/** Issue one of the above against a context. */
export async function callRoute(
  context: BrowserContext,
  route: { method: "get" | "post" | "patch" | "put" | "delete"; path: string; data?: unknown },
): Promise<{ status: number; body: string }> {
  const response = await context.request[route.method](
    route.path,
    route.data === undefined ? undefined : { data: route.data },
  );
  return { status: response.status(), body: await response.text() };
}
