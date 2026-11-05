/**
 * Cross-teacher isolation, against a running server, over plain HTTP.
 *
 * This is the Playwright isolation test's assertions without the browser:
 *
 *   pnpm dev --api-only          # in one terminal
 *   pnpm verify:isolation        # in another
 *
 * Two reasons it exists alongside `e2e/workspace-isolation.spec.ts` rather than
 * being redundant with it:
 *
 *   1. It covers the REAL DATA PATH. The route tests in
 *      `apps/server/src/routes/school-routes.test.ts` make the same assertions
 *      but over in-memory repositories, so they prove the handlers and services
 *      scope correctly while saying nothing about the SQL. This drives the
 *      Drizzle repositories against Postgres, so the `WHERE teacher_id = $1`
 *      clauses and the composite foreign keys are what is being tested.
 *   2. It runs where Playwright cannot. A headless Chromium needs system
 *      libraries (libglib and friends) that are not present on every CI runner,
 *      and an isolation check is the last thing that should be skipped because
 *      a browser would not start. Nothing here needs a DOM: every assertion is
 *      about an HTTP response.
 *
 * The browser-driven spec is still the real end-to-end check — it proves the
 * session cookie works as a browser applies it. This proves the server refuses
 * the request.
 */

const BASE = process.env["VERIFY_BASE_URL"] ?? `http://127.0.0.1:${process.env["PORT"] ?? 3000}`;

let failures = 0;

function check(ok, label, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail === "" ? "" : ` — ${detail}`}`);
  if (!ok) failures += 1;
}

const PASSWORD = "verify-correct-horse-battery";

/**
 * The invite code the server under test was started with. Sign-up is
 * invite-only and fails closed, so without this every sign-up below answers
 * 503 and the script would report a confusing cascade of failures instead of
 * the one thing that is actually wrong.
 */
const INVITE_CODE = process.env["SIGNUP_INVITE_CODE"]?.trim() ?? "";
if (INVITE_CODE === "") {
  console.error(
    "SIGNUP_INVITE_CODE is not set, so the server under test has sign-up disabled.\n" +
      "Set it in web/.env or in the environment before running this script.",
  );
  process.exit(1);
}

/**
 * A session cookie for a fresh teacher.
 *
 * Two requests: sign-up issues no session — its response is identical for a
 * real sign-up, a taken address and a wrong invite code — so login is what
 * produces the cookie.
 */
async function signUp(label) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@verify.test`;
  const signup = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      displayName: label,
      inviteCode: INVITE_CODE,
    }),
  });
  if (signup.status !== 201) {
    throw new Error(`signup failed: ${signup.status} ${await signup.text()}`);
  }

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  // A 401 means the sign-up did not register anyone, which with a uniform 201
  // above means a rejected invite code.
  if (login.status !== 200) {
    throw new Error(`login after signup failed: ${login.status} ${await login.text()}`);
  }
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (cookie === undefined) throw new Error("login issued no cookie");
  return { email, cookie };
}

async function call(cookie, method, path, body) {
  const headers = { Cookie: cookie };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.text() };
}

async function expectOk(cookie, method, path, body) {
  const result = await call(cookie, method, path, body);
  if (result.status >= 400) {
    throw new Error(`${method} ${path} failed: ${result.status} ${result.body}`);
  }
  return JSON.parse(result.body);
}

/** A class, two students, an assessment and a recorded grade. */
async function seed(cookie) {
  const { class: created } = await expectOk(cookie, "POST", "/api/classes", {
    name: "Period 1",
    courseName: "Algebra I",
  });
  const { student } = await expectOk(cookie, "POST", `/api/classes/${created.id}/students`, {
    name: "Ada Lovelace",
  });
  const { assessment } = await expectOk(
    cookie,
    "POST",
    `/api/classes/${created.id}/assessments`,
    { name: "Unit 1 Exam", maxScore: 100, assignedOn: "2026-02-03" },
  );
  await expectOk(cookie, "PUT", `/api/assessments/${assessment.id}/grades/${student.id}`, {
    score: 77,
    exempt: false,
    late: false,
  });
  return { classId: created.id, studentId: student.id, assessmentId: assessment.id };
}

/** Every route that touches teacher-owned data. */
function ownedDataRoutes({ classId, studentId, assessmentId }) {
  return [
    ["GET", `/api/classes/${classId}`],
    ["PATCH", `/api/classes/${classId}`, { name: "Hijacked" }],
    ["DELETE", `/api/classes/${classId}`],
    ["POST", `/api/classes/${classId}/students`, { name: "Injected" }],
    ["GET", `/api/classes/${classId}/students`],
    ["GET", `/api/students/${studentId}`],
    ["PATCH", `/api/students/${studentId}`, { name: "Hijacked" }],
    ["DELETE", `/api/students/${studentId}`],
    [
      "POST",
      `/api/classes/${classId}/assessments`,
      { name: "Injected", maxScore: 10, assignedOn: "2026-03-01" },
    ],
    ["GET", `/api/classes/${classId}/assessments`],
    ["GET", `/api/assessments/${assessmentId}`],
    ["PATCH", `/api/assessments/${assessmentId}`, { name: "Hijacked" }],
    ["DELETE", `/api/assessments/${assessmentId}`],
    [
      "PUT",
      `/api/assessments/${assessmentId}/grades/${studentId}`,
      { score: 0, exempt: false, late: false },
    ],
    ["DELETE", `/api/assessments/${assessmentId}/grades/${studentId}`],
    ["GET", `/api/assessments/${assessmentId}/grades`],
    ["GET", `/api/classes/${classId}/gradebook`],
    ["GET", `/api/classes/${classId}/students/${studentId}/grade`],
    ["GET", `/api/assessments/${assessmentId}/results`],
  ];
}

/* ------------------------------------------------------------------ run it */

const health = await fetch(`${BASE}/api/health`).catch(() => null);
if (health === null || !health.ok) {
  console.error(`No server answering at ${BASE}. Start one with \`pnpm dev --api-only\`.`);
  process.exit(1);
}
console.log(`verifying cross-teacher isolation against ${BASE}\n`);

const a = await signUp("alice");
const b = await signUp("bob");
await seed(a.cookie);
const bob = await seed(b.cookie);

/** B's whole workspace, as B sees it. */
async function bobsView() {
  const paths = [
    "/api/classes",
    `/api/classes/${bob.classId}`,
    `/api/classes/${bob.classId}/students`,
    `/api/classes/${bob.classId}/assessments`,
    `/api/classes/${bob.classId}/gradebook`,
    `/api/assessments/${bob.assessmentId}/grades`,
    `/api/assessments/${bob.assessmentId}/results`,
  ];
  const parts = [];
  for (const path of paths) {
    const result = await call(b.cookie, "GET", path);
    parts.push(`${path} ${result.status} ${result.body}`);
  }
  return parts.join("\n");
}

const before = await bobsView();
// B's data is really there, so "unchanged" below is not two empty reads.
check(before.includes("Ada Lovelace"), "B's workspace is populated before the attack");
check(before.includes("Unit 1 Exam"), "B's assessment is readable by B");

// Ids that were never issued, for the control request.
const nobodys = {
  classId: "00000000-0000-4000-8000-000000000001",
  studentId: "00000000-0000-4000-8000-000000000002",
  assessmentId: "00000000-0000-4000-8000-000000000003",
};

const attacked = ownedDataRoutes(bob);
const controls = ownedDataRoutes(nobodys);

console.log(`\nA against B's ids, ${attacked.length} routes:`);
for (const [index, [method, path, body]] of attacked.entries()) {
  const [, controlPath, controlBody] = controls[index];
  const asAlice = await call(a.cookie, method, path, body);
  const asNobody = await call(a.cookie, method, controlPath, controlBody);

  // 404, not 403: a 403 on a real id would confirm it exists and belongs to
  // somebody, which is an enumeration oracle over the whole table.
  const denied = asAlice.status === 404;
  // And indistinguishable from an id that belongs to nobody — status and body
  // both, because any difference is the same oracle by a subtler route.
  const indistinguishable =
    asAlice.status === asNobody.status && asAlice.body === asNobody.body;

  check(
    denied && indistinguishable,
    `${method} ${path.replace(bob.classId, ":class").replace(bob.studentId, ":student").replace(bob.assessmentId, ":assessment")}`,
    denied
      ? indistinguishable
        ? ""
        : `404 but distinguishable from a nonexistent id (${asAlice.body} vs ${asNobody.body})`
      : `expected 404, got ${asAlice.status} ${asAlice.body}`,
  );
}

console.log("\nafter the attack:");
check(
  (await bobsView()) === before,
  "B's workspace is byte-identical, read back through B's own session",
);

const alicesClasses = await expectOk(a.cookie, "GET", "/api/classes");
check(
  !alicesClasses.classes.some((value) => value.id === bob.classId),
  "A's class list never contains B's class",
);

console.log(
  failures === 0
    ? "\nISOLATION HELD on every route"
    : `\n${failures} ISOLATION FAILURE(S)`,
);
process.exit(failures === 0 ? 0 : 1);
