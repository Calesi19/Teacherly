import { expect, test } from "@playwright/test";

import { expectSignedIn, fetchMe, newTeacher, signIn, signOut, signUp } from "./fixtures";

test("a teacher can sign up, sign out, and sign back in", async ({ page, context }) => {
  const teacher = newTeacher("happy");

  await signUp(page, teacher);

  // Signing up must leave the teacher logged in, not bounce them to a login form.
  await expectSignedIn(page, teacher);

  await signOut(page);

  // The cookie was revoked server-side, so /api/me stops answering for it —
  // this is the check that logout is not merely a client-side forget.
  expect((await fetchMe(context)).status).toBe(401);

  await signIn(page, teacher);

  const me = await fetchMe(context);
  expect(me.status).toBe(200);
  expect(me.teacher?.email).toBe(teacher.email);
  expect(me.teacher?.displayName).toBe(teacher.displayName);
});

test("a wrong password is rejected without revealing that the account exists", async ({ page }) => {
  const teacher = newTeacher("wrongpw");
  await signUp(page, teacher);
  await signOut(page);

  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Password").fill(`${teacher.password}-not-it`);
  await page.getByRole("button", { name: "Sign in" }).click();

  const knownEmailError = await page.getByRole("alert").textContent();
  expect(knownEmailError).toBe("That email and password combination is not valid.");

  // The same message for an address with no account at all. A client that can
  // see both responses cannot tell which email is registered.
  await page.getByLabel("Email").fill(newTeacher("nobody").email);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText(knownEmailError ?? "");
});
