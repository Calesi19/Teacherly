import pg from "pg";

import { loadEnv, requireDatabaseUrl } from "../src/env.ts";

/**
 * Proves that tenant isolation and the grading-scale invariants are enforced by
 * the DATABASE, not merely by the repositories above it.
 *
 * Run against a migrated database:
 *
 *   pnpm db:up && pnpm db:migrate && pnpm --filter @teacherly/db verify:constraints
 *
 * Not part of `pnpm test`, deliberately: the unit and route suites run with no
 * Postgres at all, and making the default test command need a live server would
 * trade that away. This is the check you run when you have changed the schema.
 *
 * Every statement below is one the application should never issue. Each is
 * expected to be REFUSED, and the script fails if any of them is accepted — so
 * "the composite foreign keys make a cross-teacher row unrepresentable" is a
 * claim with a test behind it rather than a comment in a schema file.
 *
 * It writes to the database it is pointed at, inside a transaction that is
 * rolled back, so a migrated-but-empty database is left migrated and empty.
 */

loadEnv();

const c = new pg.Client(requireDatabaseUrl());
await c.connect();
// Everything happens in one transaction that is never committed. Each failing
// statement is wrapped in its own SAVEPOINT, because an error otherwise aborts
// the whole transaction and every later statement reports 25P02 instead of its
// own constraint.
await c.query("BEGIN");

async function expectReject(label, sql, params = []) {
  await c.query("SAVEPOINT probe");
  try {
    await c.query(sql, params);
    await c.query("ROLLBACK TO SAVEPOINT probe");
    console.log(`  FAIL  ${label} \u2014 the database ACCEPTED this`);
    return false;
  } catch (e) {
    await c.query("ROLLBACK TO SAVEPOINT probe");
    console.log(`  ok    ${label} -> ${e.code} ${e.constraint ?? ""}`);
    return true;
  }
}

const [a] = (await c.query(
  `INSERT INTO teachers (email, password_hash, display_name) VALUES ('a@x.test','h','A') RETURNING id`)).rows;
const [b] = (await c.query(
  `INSERT INTO teachers (email, password_hash, display_name) VALUES ('b@x.test','h','B') RETURNING id`)).rows;
const [ca] = (await c.query(
  `INSERT INTO classes (teacher_id, name, course_name) VALUES ($1,'A cls','Alg') RETURNING id, scale_a, scale_b, scale_c, scale_d`, [a.id])).rows;
const [cb] = (await c.query(
  `INSERT INTO classes (teacher_id, name, course_name) VALUES ($1,'B cls','Alg') RETURNING id`, [b.id])).rows;
const [sa] = (await c.query(
  `INSERT INTO students (teacher_id, class_id, name) VALUES ($1,$2,'Ada') RETURNING id`, [a.id, ca.id])).rows;
const [ea] = (await c.query(
  `INSERT INTO assessments (teacher_id, class_id, name, max_score, assigned_on) VALUES ($1,$2,'Exam',100,'2026-02-03') RETURNING id`, [a.id, ca.id])).rows;
const [sb] = (await c.query(
  `INSERT INTO students (teacher_id, class_id, name) VALUES ($1,$2,'Bob') RETURNING id`, [b.id, cb.id])).rows;

console.log(`\ndefault scale on a new class: a=${ca.scale_a} b=${ca.scale_b} c=${ca.scale_c} d=${ca.scale_d}`);

console.log("\ntenant isolation, enforced by composite foreign keys:");
let ok = true;
ok &= await expectReject("a student in B's class labelled as A's teacher",
  `INSERT INTO students (teacher_id, class_id, name) VALUES ($1,$2,'Mole')`, [a.id, cb.id]);
ok &= await expectReject("an assessment in B's class labelled as A's",
  `INSERT INTO assessments (teacher_id, class_id, name, max_score, assigned_on) VALUES ($1,$2,'X',10,'2026-02-03')`, [a.id, cb.id]);
ok &= await expectReject("a grade stapling A's assessment to B's student",
  `INSERT INTO grades (teacher_id, assessment_id, student_id, score) VALUES ($1,$2,$3,50)`, [a.id, ea.id, sb.id]);
ok &= await expectReject("a grade on A's rows claimed by teacher B",
  `INSERT INTO grades (teacher_id, assessment_id, student_id, score) VALUES ($1,$2,$3,50)`, [b.id, ea.id, sa.id]);

console.log("\ngrading-scale invariants, enforced by CHECK:");
ok &= await expectReject("B cutoff above A",
  `INSERT INTO classes (teacher_id,name,course_name,scale_a,scale_b,scale_c,scale_d) VALUES ($1,'x','y',80,90,70,60)`, [a.id]);
ok &= await expectReject("A cutoff above 100",
  `INSERT INTO classes (teacher_id,name,course_name,scale_a,scale_b,scale_c,scale_d) VALUES ($1,'x','y',101,80,70,60)`, [a.id]);
ok &= await expectReject("D cutoff of 0 (F unearnable)",
  `INSERT INTO classes (teacher_id,name,course_name,scale_a,scale_b,scale_c,scale_d) VALUES ($1,'x','y',90,80,70,0)`, [a.id]);

console.log("\nother invariants:");
ok &= await expectReject("a zero-point assessment",
  `INSERT INTO assessments (teacher_id,class_id,name,max_score,assigned_on) VALUES ($1,$2,'Z',0,'2026-02-03')`, [a.id, ca.id]);
ok &= await expectReject("a negative score",
  `INSERT INTO grades (teacher_id,assessment_id,student_id,score) VALUES ($1,$2,$3,-1)`, [a.id, ea.id, sa.id]);
ok &= await expectReject("a blank class name",
  `INSERT INTO classes (teacher_id,name,course_name) VALUES ($1,'   ','Alg')`, [a.id]);

// The missing-row-vs-zero distinction, at the table.
await c.query(`INSERT INTO grades (teacher_id,assessment_id,student_id,score) VALUES ($1,$2,$3,NULL)`, [a.id, ea.id, sa.id]);
const r = (await c.query(`SELECT score FROM grades WHERE assessment_id=$1 AND student_id=$2`, [ea.id, sa.id])).rows[0];
console.log(`\nscore column accepts NULL and does not default to 0: score = ${r.score === null ? "NULL" : r.score}`);
ok &= await expectReject("a second grade for the same (assessment, student) pair",
  `INSERT INTO grades (teacher_id,assessment_id,student_id,score) VALUES ($1,$2,$3,5)`, [a.id, ea.id, sa.id]);

console.log(ok ? "\nALL CONSTRAINTS HELD" : "\nSOME CONSTRAINTS DID NOT HOLD");

// Nothing this script wrote survives.
await c.query("ROLLBACK");
await c.end();
process.exit(ok ? 0 : 1);
