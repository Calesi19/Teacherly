import { expect, test } from "@playwright/test";

import {
  callRoute,
  fetchMe,
  newTeacher,
  newTeacherContext,
  ownedDataRoutes,
  seedWorkspace,
  signUp,
} from "./fixtures";

/**
 * The isolation suite: two concurrent, fully independent browser contexts, each
 * with its own session cookie.
 *
 * The first test covers identity, which was all there was to isolate in chunk
 * 1. The second covers this chunk's teacher-owned data — classes, students,
 * assessments and grades — across every route that touches it.
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

/**
 * Teacher A cannot read, update or delete any of teacher B's classes, students,
 * assessments or grades.
 *
 * Every route is driven with A's real session cookie against B's real ids, and
 * two things are asserted for each:
 *
 *   1. A is refused with a 404 — not a 403, which on a real id would confirm
 *      the id exists and belongs to somebody.
 *   2. A's answer is byte-identical to the answer for an id that belongs to
 *      nobody. If the two differed in any way, the difference would let a
 *      caller walk the id space and discover other teachers' records.
 *
 * Then B's whole workspace is read back through B's own session and compared
 * against a snapshot taken before the attack, because "the writes 404'd" is a
 * weaker claim than "nothing was written".
 */
test("teacher A cannot touch teacher B's classes, students, assessments or grades", async ({
  browser,
  baseURL,
}) => {
  expect(baseURL).toBeDefined();

  const alice = newTeacher("alice");
  const bob = newTeacher("bob");

  const a = await newTeacherContext(browser, baseURL as string);
  const b = await newTeacherContext(browser, baseURL as string);

  try {
    await signUp(a.page, alice);
    await signUp(b.page, bob);

    // Both teachers get a workspace. A's exists so that the test is not
    // "a teacher with no data cannot see anything".
    await seedWorkspace(a.context);
    const bobsWorkspace = await seedWorkspace(b.context);

    /** B's workspace, as B sees it. */
    async function bobsView(): Promise<string> {
      const parts: string[] = [];
      for (const path of [
        "/api/classes",
        `/api/classes/${bobsWorkspace.classId}`,
        `/api/classes/${bobsWorkspace.classId}/students`,
        `/api/classes/${bobsWorkspace.classId}/assessments`,
        `/api/classes/${bobsWorkspace.classId}/gradebook`,
        `/api/assessments/${bobsWorkspace.assessmentId}/grades`,
        `/api/assessments/${bobsWorkspace.assessmentId}/results`,
      ]) {
        const response = await b.context.request.get(path);
        parts.push(`${path} ${response.status()} ${await response.text()}`);
      }
      return parts.join("\n");
    }

    const before = await bobsView();
    // B's data really is there, so a later "unchanged" is not two empty reads.
    expect(before).toContain("Ada Lovelace");
    expect(before).toContain("Unit 1 Exam");

    // Ids that were never issued, for the control request.
    const nobodys = {
      classId: "00000000-0000-4000-8000-000000000001",
      studentId: "00000000-0000-4000-8000-000000000002",
      assessmentId: "00000000-0000-4000-8000-000000000003",
    };

    const attacked = ownedDataRoutes(bobsWorkspace);
    const controls = ownedDataRoutes(nobodys);
    expect(attacked).toHaveLength(controls.length);

    for (const [index, route] of attacked.entries()) {
      const control = controls[index];
      expect(control).toBeDefined();

      const asAlice = await callRoute(a.context, route);
      const asNobody = await callRoute(a.context, control as NonNullable<typeof control>);

      expect(
        asAlice.status,
        `${route.method.toUpperCase()} ${route.path} should be 404 for another teacher`,
      ).toBe(404);

      // The anti-enumeration property: a real-but-foreign id and a fabricated
      // one are indistinguishable.
      expect(
        asAlice.status,
        `${route.method.toUpperCase()} ${route.path} leaks existence via status`,
      ).toBe(asNobody.status);
      expect(
        asAlice.body,
        `${route.method.toUpperCase()} ${route.path} leaks existence via body`,
      ).toBe(asNobody.body);
    }

    // Nothing A did changed anything of B's.
    expect(await bobsView()).toBe(before);

    // And A's own listing never contained B's class at any point.
    const alicesClasses = await a.context.request.get("/api/classes");
    const body = (await alicesClasses.json()) as { classes: { id: string }[] };
    expect(body.classes.map((value) => value.id)).not.toContain(bobsWorkspace.classId);
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
