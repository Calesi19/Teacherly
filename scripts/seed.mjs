import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';

const DB_PATH = path.join(
  os.homedir(),
  'Library/Application Support/com.calesi19.teacherly/teacherly.db'
);

const RESET = process.argv.includes('--reset');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

if (RESET) {
  console.log('Resetting existing data (soft-delete)...');
  for (const table of [
    'student_notes', 'attendance_records', 'assignment_scores',
    'assignments', 'schedule_periods', 'student_accommodations',
    'student_services', 'student_addresses', 'contacts', 'students', 'groups',
  ]) {
    db.prepare(`UPDATE ${table} SET is_deleted = 1`).run();
  }
}

const seed = db.prepare.bind(db);

// ── Groups ────────────────────────────────────────────────────────────────────

const insertGroup = seed(
  `INSERT INTO groups (name, grade, school_name, start_date, end_date)
   VALUES (?, ?, ?, ?, ?)`
);

const { lastInsertRowid: g1 } = insertGroup.run('3rd Grade A', '3', 'Lincoln Elementary', '2024-09-02', '2025-06-13');
const { lastInsertRowid: g2 } = insertGroup.run('4th Grade B', '4', 'Lincoln Elementary', '2024-09-02', '2025-06-13');

// ── Students ──────────────────────────────────────────────────────────────────

const insertStudent = seed(
  `INSERT INTO students (group_id, name, gender, birthdate, student_number, enrollment_date)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const g1Students = [
  ['Emma Johnson',    'Female', '2015-03-22', 'STU001'],
  ['Liam Martinez',   'Male',   '2015-07-14', 'STU002'],
  ['Sophia Chen',     'Female', '2015-11-05', 'STU003'],
  ['Noah Williams',   'Male',   '2016-01-30', 'STU004'],
  ['Olivia Brown',    'Female', '2015-09-18', 'STU005'],
  ['Elijah Davis',    'Male',   '2015-06-03', 'STU006'],
  ['Ava Thompson',    'Female', '2015-12-22', 'STU007'],
  ['James Garcia',    'Male',   '2016-02-11', 'STU008'],
].map(([name, gender, birthdate, number]) => ({
  id: insertStudent.run(g1, name, gender, birthdate, number, '2024-09-02').lastInsertRowid,
  name,
}));

const g2Students = [
  ['Isabella Wilson', 'Female', '2014-04-09', 'STU009'],
  ['Mason Anderson',  'Male',   '2014-08-17', 'STU010'],
  ['Mia Taylor',      'Female', '2014-12-01', 'STU011'],
  ['Ethan Moore',     'Male',   '2015-02-25', 'STU012'],
  ['Charlotte Lee',   'Female', '2014-07-30', 'STU013'],
  ['Aiden Jackson',   'Male',   '2014-10-14', 'STU014'],
  ['Amelia White',    'Female', '2014-05-19', 'STU015'],
  ['Lucas Harris',    'Male',   '2015-01-08', 'STU016'],
].map(([name, gender, birthdate, number]) => ({
  id: insertStudent.run(g2, name, gender, birthdate, number, '2024-09-02').lastInsertRowid,
  name,
}));

const allStudents = [...g1Students, ...g2Students];

// ── Contacts ──────────────────────────────────────────────────────────────────

const insertContact = seed(
  `INSERT INTO contacts (student_id, name, relationship, phone, email, is_emergency_contact, is_primary_guardian)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const contactData = [
  ['Maria Johnson',    'Mother', '555-0101', 'maria.johnson@email.com',     1, 1],
  ['Robert Martinez',  'Father', '555-0102', 'r.martinez@email.com',        1, 1],
  ['Lily Chen',        'Mother', '555-0103', 'lily.chen@email.com',         1, 1],
  ['David Williams',   'Father', '555-0104', 'd.williams@email.com',        1, 1],
  ['Sarah Brown',      'Mother', '555-0105', 'sarah.brown@email.com',       1, 1],
  ['Michael Davis',    'Father', '555-0106', 'm.davis@email.com',           1, 1],
  ['Jennifer Thompson','Mother', '555-0107', 'j.thompson@email.com',        1, 1],
  ['Carlos Garcia',    'Father', '555-0108', 'c.garcia@email.com',          1, 1],
  ['Patricia Wilson',  'Mother', '555-0109', 'p.wilson@email.com',          1, 1],
  ['Daniel Anderson',  'Father', '555-0110', 'd.anderson@email.com',        1, 1],
  ['Linda Taylor',     'Mother', '555-0111', 'l.taylor@email.com',          1, 1],
  ['Christopher Moore','Father', '555-0112', 'c.moore@email.com',           1, 1],
  ['Barbara Lee',      'Mother', '555-0113', 'b.lee@email.com',             1, 1],
  ['Matthew Jackson',  'Father', '555-0114', 'm.jackson@email.com',         1, 1],
  ['Susan White',      'Mother', '555-0115', 's.white@email.com',           1, 1],
  ['Anthony Harris',   'Father', '555-0116', 'a.harris@email.com',          1, 1],
];

// Extra emergency contacts for some students
const extraContacts = [
  [0, 'Tom Johnson',     'Uncle',       '555-0201', null,                    1, 0],
  [2, 'Wei Chen',        'Grandfather', '555-0203', null,                    1, 0],
  [4, 'Karen Brown',     'Aunt',        '555-0205', 'k.brown@email.com',     1, 0],
  [8, 'George Wilson',   'Grandfather', '555-0209', null,                    1, 0],
];

allStudents.forEach(({ id }, i) => {
  const [name, rel, phone, email, isEmerg, isPrimary] = contactData[i];
  insertContact.run(id, name, rel, phone, email, isEmerg, isPrimary);
});

for (const [studentIndex, name, rel, phone, email, isEmerg, isPrimary] of extraContacts) {
  insertContact.run(allStudents[studentIndex].id, name, rel, phone, email ?? null, isEmerg, isPrimary);
}

// ── Addresses ─────────────────────────────────────────────────────────────────

const insertAddress = seed(
  `INSERT INTO student_addresses (student_id, label, street, city, state, zip_code, country, is_student_home)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const streets = [
  '123 Maple St', '456 Oak Ave', '789 Pine Rd', '321 Elm St',
  '654 Cedar Blvd', '987 Birch Ln', '159 Walnut Dr', '753 Spruce Ct',
  '246 Ash Way', '802 Poplar St', '135 Hickory Pl', '579 Willow Ave',
  '468 Chestnut Rd', '913 Sycamore Blvd', '624 Magnolia Dr', '371 Cypress Ln',
];

allStudents.forEach(({ id }, i) => {
  insertAddress.run(id, 'Home', streets[i], 'Springfield', 'IL', '62701', 'USA', 1);
});

// ── Student Services (for a few students) ────────────────────────────────────

const insertServices = seed(
  `INSERT INTO student_services
     (student_id, has_special_education, therapy_speech, therapy_occupational,
      therapy_psychological, therapy_physical, therapy_educational,
      medical_plan, has_treatment, allergies, conditions)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

insertServices.run(g1Students[1].id, 1, 1, 0, 0, 0, 1, 'government', 1, 'Peanuts', 'ADHD');
insertServices.run(g1Students[4].id, 0, 0, 0, 0, 0, 0, 'private',    1, null,      'Asthma');
insertServices.run(g2Students[2].id, 1, 0, 1, 1, 0, 0, 'government', 0, null,      'Dyslexia');
insertServices.run(g2Students[5].id, 0, 1, 0, 0, 0, 0, 'none',       0, 'Dairy',   null);

// ── Accommodations (for the same students) ───────────────────────────────────

const insertAccom = seed(
  `INSERT INTO student_accommodations
     (student_id, desk_placement, extended_time, shorter_assignments,
      use_abacus, simple_instructions, visual_examples)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

insertAccom.run(g1Students[1].id, 1, 1, 1, 0, 1, 1);
insertAccom.run(g1Students[4].id, 0, 1, 0, 0, 0, 0);
insertAccom.run(g2Students[2].id, 1, 1, 1, 1, 1, 1);
insertAccom.run(g2Students[5].id, 0, 0, 0, 0, 1, 0);

// ── Schedule Periods ──────────────────────────────────────────────────────────

const insertPeriod = seed(
  `INSERT INTO schedule_periods (group_id, day_of_week, name, start_time, end_time, sort_order)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const periods = [
  ['Math',    '08:00', '08:45', 0],
  ['Reading', '09:00', '09:45', 1],
  ['Science', '10:00', '10:45', 2],
  ['Writing', '11:00', '11:45', 3],
];

// Mon–Fri (1–5) for each group
const g1PeriodIds = [];
const g2PeriodIds = [];

for (let day = 1; day <= 5; day++) {
  for (const [name, start, end, order] of periods) {
    const r1 = insertPeriod.run(g1, day, name, start, end, order);
    const r2 = insertPeriod.run(g2, day, name, start, end, order);
    g1PeriodIds.push({ day, name, id: r1.lastInsertRowid });
    g2PeriodIds.push({ day, name, id: r2.lastInsertRowid });
  }
}

// ── Assignments ───────────────────────────────────────────────────────────────

const insertAssignment = seed(
  `INSERT INTO assignments (group_id, period_name, title, description, max_score, tag)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const g1Assignments = [
  insertAssignment.run(g1, 'Math',    'Chapter 3 Worksheet',     'Pages 45–46',              20,  'Homework'),
  insertAssignment.run(g1, 'Math',    'Addition & Subtraction Quiz', null,                   100, 'Quiz'),
  insertAssignment.run(g1, 'Reading', 'Book Report – Charlotte\'s Web', 'Min 1 page',        100, 'Project'),
  insertAssignment.run(g1, 'Science', 'Plant Life Cycle Diagram', 'Label all stages',        30,  'Homework'),
  insertAssignment.run(g1, 'Math',    'Unit 1 Exam',              null,                      100, 'Exam'),
].map(r => r.lastInsertRowid);

const g2Assignments = [
  insertAssignment.run(g2, 'Math',    'Fractions Worksheet',      'Pages 12–13',             20,  'Homework'),
  insertAssignment.run(g2, 'Math',    'Fractions Quiz',           null,                      100, 'Quiz'),
  insertAssignment.run(g2, 'Reading', 'Comprehension – Chapter 4', 'Answer all 10 questions', 50, 'Homework'),
  insertAssignment.run(g2, 'Writing', 'Personal Narrative Essay', 'Min 3 paragraphs',        100, 'Project'),
  insertAssignment.run(g2, 'Math',    'Mid-Term Exam',            null,                      100, 'Exam'),
].map(r => r.lastInsertRowid);

// ── Assignment Scores ─────────────────────────────────────────────────────────

const insertScore = seed(
  `INSERT OR IGNORE INTO assignment_scores (assignment_id, student_id, score, exempt, late, note)
   VALUES (?, ?, ?, ?, ?, ?)`
);

function randomScore(max) {
  return Math.round((0.6 + Math.random() * 0.4) * max * 10) / 10;
}

for (const assignId of g1Assignments) {
  for (const { id: studentId } of g1Students) {
    const exempt = Math.random() < 0.05 ? 1 : 0;
    const late   = Math.random() < 0.1  ? 1 : 0;
    insertScore.run(assignId, studentId, exempt ? null : randomScore(20), exempt, late, null);
  }
}

for (const assignId of g2Assignments) {
  for (const { id: studentId } of g2Students) {
    const exempt = Math.random() < 0.05 ? 1 : 0;
    const late   = Math.random() < 0.1  ? 1 : 0;
    insertScore.run(assignId, studentId, exempt ? null : randomScore(20), exempt, late, null);
  }
}

// ── Attendance Records (last 5 school days) ───────────────────────────────────

const insertAttendance = seed(
  `INSERT OR IGNORE INTO attendance_records (schedule_period_id, student_id, date, status, notes)
   VALUES (?, ?, ?, ?, ?)`
);

function lastSchoolDays(n) {
  const days = [];
  const d = new Date('2026-04-25'); // anchor to a Friday
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

const recentDays = lastSchoolDays(5);
const statuses   = ['present', 'present', 'present', 'present', 'late', 'absent'];

for (const { day, id: periodId } of g1PeriodIds) {
  for (const date of recentDays) {
    const dow = new Date(date + 'T12:00:00').getDay();
    if (dow !== day) continue;
    for (const { id: studentId } of g1Students) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const notes  = status === 'late' ? 'Arrived 10 minutes late' : null;
      insertAttendance.run(periodId, studentId, date, status, notes);
    }
  }
}

for (const { day, id: periodId } of g2PeriodIds) {
  for (const date of recentDays) {
    const dow = new Date(date + 'T12:00:00').getDay();
    if (dow !== day) continue;
    for (const { id: studentId } of g2Students) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const notes  = status === 'late' ? 'Arrived 10 minutes late' : null;
      insertAttendance.run(periodId, studentId, date, status, notes);
    }
  }
}

// ── Student Notes ─────────────────────────────────────────────────────────────

const insertNote = seed(
  `INSERT INTO student_notes (student_id, content, tags)
   VALUES (?, ?, ?)`
);

const noteTemplates = [
  ['Excellent participation in class discussion today.',          'positive'],
  ['Turned in homework late for the third time this week.',       'attendance'],
  ['Had a conflict with a peer during recess — resolved calmly.', 'incident'],
  ['Parent called to report child was not feeling well.',         'health'],
  ['Outstanding improvement on the last quiz!',                  'positive'],
  ['Referred to counselor for follow-up.',                       'referral'],
  ['Struggled with fractions — will need extra support.',        'negative'],
  ['Showed great leadership during group activity.',             'positive'],
];

allStudents.forEach(({ id }, i) => {
  const t1 = noteTemplates[i % noteTemplates.length];
  const t2 = noteTemplates[(i + 4) % noteTemplates.length];
  insertNote.run(id, t1[0], t1[1]);
  insertNote.run(id, t2[0], t2[1]);
});

// ── Done ──────────────────────────────────────────────────────────────────────

const counts = {
  groups:              db.prepare('SELECT COUNT(*) AS n FROM groups              WHERE is_deleted=0').get().n,
  students:            db.prepare('SELECT COUNT(*) AS n FROM students            WHERE is_deleted=0').get().n,
  contacts:            db.prepare('SELECT COUNT(*) AS n FROM contacts            WHERE is_deleted=0').get().n,
  student_addresses:   db.prepare('SELECT COUNT(*) AS n FROM student_addresses   WHERE is_deleted=0').get().n,
  schedule_periods:    db.prepare('SELECT COUNT(*) AS n FROM schedule_periods    WHERE is_deleted=0').get().n,
  assignments:         db.prepare('SELECT COUNT(*) AS n FROM assignments         WHERE is_deleted=0').get().n,
  assignment_scores:   db.prepare('SELECT COUNT(*) AS n FROM assignment_scores   WHERE is_deleted=0').get().n,
  attendance_records:  db.prepare('SELECT COUNT(*) AS n FROM attendance_records  WHERE is_deleted=0').get().n,
  student_notes:       db.prepare('SELECT COUNT(*) AS n FROM student_notes       WHERE is_deleted=0').get().n,
};

console.log('Seeded successfully:');
for (const [table, n] of Object.entries(counts)) {
  console.log(`  ${table.padEnd(22)} ${n}`);
}
