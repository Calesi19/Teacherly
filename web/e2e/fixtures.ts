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
