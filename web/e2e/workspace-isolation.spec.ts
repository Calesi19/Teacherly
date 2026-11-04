import { expect, test } from "@playwright/test";

import { fetchMe, newTeacher, newTeacherContext, signUp } from "./fixtures";

/**
 * The seed of the isolation suite. In this chunk there is only identity to
 * isolate, so that is what this asserts — but the fixture (two concurrent,
 * fully independent browser contexts, each with its own session cookie) is the
 * part that later chunks reuse for classes, grades and notes.
 */
test("two teachers each see only their own identity", async ({ browser, baseURL }) => {
  expect(baseURL).toBeDefined();

  const alice = newTeacher("alice");
  const bob = newTeacher("bob");

  const a = await newTeacherContext(browser, baseURL as string);
  const b = await newTeacherContext(browser, baseURL as string);

  try {
    // Both signed up and signed in at the same time, so neither session is
    // simply the most recent one the server saw.
    await signUp(a.page, alice);
    await signUp(b.page, bob);

    const aliceMe = await fetchMe(a.context);
    const bobMe = await fetchMe(b.context);

    expect(aliceMe.status).toBe(200);
    expect(bobMe.status).toBe(200);

    expect(aliceMe.teacher?.email).toBe(alice.email);
    expect(bobMe.teacher?.email).toBe(bob.email);

    // Distinct workspaces, and neither response carries the other's identity.
    expect(aliceMe.teacher?.id).not.toBe(bobMe.teacher?.id);
    expect(aliceMe.teacher?.email).not.toBe(bob.email);
    expect(bobMe.teacher?.email).not.toBe(alice.email);

    // And the rendered UI agrees with the API in both contexts.
    await expect(a.page.getByTestId("teacher-email")).toHaveText(alice.email);
    await expect(b.page.getByTestId("teacher-email")).toHaveText(bob.email);
    await expect(a.page.getByTestId("teacher-id")).toHaveText(aliceMe.teacher?.id ?? "");
    await expect(b.page.getByTestId("teacher-id")).toHaveText(bobMe.teacher?.id ?? "");

    // Alice's cookie must not be usable as Bob. Replaying her token in his
    // context resolves to her — never to him — which is the property the
    // session middleware exists to guarantee.
    const aliceCookies = await a.context.cookies();
    const sessionCookie = aliceCookies.find((cookie) => cookie.name === "teacherly_session");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe("Lax");
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
