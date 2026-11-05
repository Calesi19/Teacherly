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

    // Alice's cookie must not be usable as Bob. Replaying her token in a
    // third, otherwise-empty context resolves to her — never to him — which is
    // the property the session middleware exists to guarantee.
    const aliceCookies = await a.context.cookies();
    const sessionCookie = aliceCookies.find((cookie) => cookie.name === "teacherly_session");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe("Lax");

    // The replay itself. This used to be described in the comment above and
    // never actually performed: the assertions stopped at the cookie's
    // attributes, so the suite would not have noticed if a replayed token
    // resolved to the wrong teacher.
    const replay = await browser.newContext({ baseURL: baseURL as string });
    try {
      await replay.addCookies([sessionCookie as NonNullable<typeof sessionCookie>]);
      const replayedMe = await fetchMe(replay);

      // It is a live session, and it is Alice's.
      expect(replayedMe.status).toBe(200);
      expect(replayedMe.teacher?.email).toBe(alice.email);
      expect(replayedMe.teacher?.id).toBe(aliceMe.teacher?.id);

      // And under no circumstances Bob's. Asserted on the id as well as the
      // address, because the id is what every later chunk will scope by.
      expect(replayedMe.teacher?.email).not.toBe(bob.email);
      expect(replayedMe.teacher?.id).not.toBe(bobMe.teacher?.id);
    } finally {
      await replay.close();
    }
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
