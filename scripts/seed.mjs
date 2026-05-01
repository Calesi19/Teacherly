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

const studentTemplates = {
  g1: [
    ['Emma Johnson',    'Female', '2015-03-22'],
    ['Liam Martinez',   'Male',   '2015-07-14'],
    ['Sophia Chen',     'Female', '2015-11-05'],
    ['Noah Williams',   'Male',   '2016-01-30'],
    ['Olivia Brown',    'Female', '2015-09-18'],
    ['Elijah Davis',    'Male',   '2015-06-03'],
    ['Ava Thompson',    'Female', '2015-12-22'],
    ['James Garcia',    'Male',   '2016-02-11'],
  ],
  g2: [
    ['Isabella Wilson', 'Female', '2014-04-09'],
    ['Mason Anderson',  'Male',   '2014-08-17'],
    ['Mia Taylor',      'Female', '2014-12-01'],
    ['Ethan Moore',     'Male',   '2015-02-25'],
    ['Charlotte Lee',   'Female', '2014-07-30'],
    ['Aiden Jackson',   'Male',   '2014-10-14'],
    ['Amelia White',    'Female', '2014-05-19'],
    ['Lucas Harris',    'Male',   '2015-01-08'],
  ],
};

function buildStudentSet(groupId, baseNumber, templates, count, enrollmentDate) {
  const firstNames = [
    'Maya', 'Ethan', 'Lucas', 'Aria', 'Henry', 'Nora', 'Leo', 'Zoe',
    'Kai', 'Luna', 'Owen', 'Ivy', 'Felix', 'Elena', 'Noel', 'Sofia',
  ];
  const lastNames = [
    'Rivera', 'Patel', 'Nguyen', 'Walker', 'Lopez', 'Hughes', 'Ross', 'Bailey',
    'Carter', 'Murphy', 'Bennett', 'Reed', 'Howard', 'King', 'Brooks', 'Price',
  ];
  const birthdays = [
    '2014-03-04', '2014-04-12', '2014-05-20', '2014-06-08',
    '2014-07-16', '2014-08-24', '2014-09-11', '2014-10-19',
    '2014-11-27', '2015-01-06', '2015-02-14', '2015-03-23',
    '2015-04-30', '2015-06-09', '2015-07-18', '2015-08-26',
  ];

  const students = [];
  const rows = Array.from({ length: count }, (_, i) => {
    if (i < templates.length) {
      const [name, gender, birthdate] = templates[i];
      return { name, gender, birthdate };
    }

    const templateIndex = i - templates.length;
    const first = firstNames[templateIndex % firstNames.length];
    const last = lastNames[(templateIndex + groupId) % lastNames.length];
    const gender = templateIndex % 2 === 0 ? 'Female' : 'Male';
    const birthdate = birthdays[templateIndex % birthdays.length];
    return { name: `${first} ${last}`, gender, birthdate };
  });

  rows.forEach((row, index) => {
    const studentNumber = `STU${String(baseNumber + index).padStart(3, '0')}`;
    const id = insertStudent.run(
      groupId,
      row.name,
      row.gender,
      row.birthdate,
      studentNumber,
      enrollmentDate,
    ).lastInsertRowid;
    students.push({ id, name: row.name });
  });

  return students;
}

const g1Students = buildStudentSet(g1, 1, studentTemplates.g1, 24, '2024-09-02');
const g2Students = buildStudentSet(g2, 25, studentTemplates.g2, 24, '2024-09-02');

const allStudents = [...g1Students, ...g2Students];

// ── Contacts ──────────────────────────────────────────────────────────────────

const insertContact = seed(
  `INSERT INTO contacts (student_id, name, relationship, phone, email, is_emergency_contact, is_primary_guardian)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

function splitName(name) {
  const [first, last = ''] = name.split(' ');
  return { first, last };
}

// Extra emergency contacts for some students
const extraContacts = [
  [0, 'Tom Johnson',     'Uncle',       '555-0201', null,                    1, 0],
  [2, 'Wei Chen',        'Grandfather', '555-0203', null,                    1, 0],
  [4, 'Karen Brown',     'Aunt',        '555-0205', 'k.brown@email.com',     1, 0],
  [8, 'George Wilson',   'Grandfather', '555-0209', null,                    1, 0],
  [12, 'Sana Taylor',    'Aunt',        '555-0212', null,                    1, 0],
  [16, 'Ibrahim Moore',  'Grandfather', '555-0216', null,                    1, 0],
  [20, 'Rosa Garcia',    'Aunt',        '555-0220', 'r.garcia@email.com',    1, 0],
  [24, 'Marta Wilson',   'Grandmother', '555-0224', null,                    1, 0],
  [28, 'Nora Anderson',  'Aunt',        '555-0228', null,                    1, 0],
  [32, 'Evan Taylor',    'Uncle',       '555-0232', null,                    1, 0],
  [36, 'Jada Lee',       'Grandmother', '555-0236', null,                    1, 0],
  [40, 'Owen White',     'Uncle',       '555-0240', null,                    1, 0],
];

allStudents.forEach(({ id, name }, i) => {
  const { first, last } = splitName(name);
  const contactFirst = i % 2 === 0 ? 'Maria' : 'Carlos';
  const contactLast = last || first;
  const relation = i % 2 === 0 ? 'Mother' : 'Father';
  const phone = `555-${String(1001 + i).padStart(4, '0')}`;
  const email = `${contactFirst.toLowerCase()}.${contactLast.toLowerCase()}@email.com`;
  insertContact.run(
    id,
    `${contactFirst} ${contactLast}`,
    relation,
    phone,
    email,
    1,
    1,
  );
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
  '180 Aspen Dr', '412 Fern St', '905 Laurel Ave', '268 Alder Ct',
  '730 Cypress Dr', '111 Meadow Ln', '502 Orchard Rd', '889 Harbor St',
  '304 Sunset Blvd', '617 Brook Ave', '225 Ridge Rd', '998 Summit Pl',
  '141 Valley Way', '376 Park Ln', '808 Garden Dr', '553 Lake St',
  '190 Prairie Ave', '447 Canyon Ct', '721 River Rd', '260 Hilltop Dr',
  '884 Grove St', '315 Birchwood Ln', '639 Stone Rd', '127 Palm Ave',
  '568 Willow Ct', '402 Maplewood Dr', '975 Forest St', '233 Cedar Ln',
  '716 Pinecrest Ave', '342 Elmwood Rd', '804 Magnolia Ct', '590 Aspen Way',
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
  ['Social Studies', '12:30', '13:15', 4],
  ['Art', '13:30', '14:15', 5],
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
  `INSERT INTO assignments (group_id, period_name, assigned_date, title, description, max_score, tag)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const assignmentDate = '2026-04-25';

const g1Assignments = [
  insertAssignment.run(g1, 'Math',    assignmentDate, 'Chapter 3 Worksheet',     'Pages 45–46',              20,  'Homework'),
  insertAssignment.run(g1, 'Math',    assignmentDate, 'Addition & Subtraction Quiz', null,                   100, 'Quiz'),
  insertAssignment.run(g1, 'Reading', assignmentDate, 'Book Report – Charlotte\'s Web', 'Min 1 page',        100, 'Project'),
  insertAssignment.run(g1, 'Science', assignmentDate, 'Plant Life Cycle Diagram', 'Label all stages',        30,  'Homework'),
  insertAssignment.run(g1, 'Math',    assignmentDate, 'Unit 1 Exam',              null,                      100, 'Exam'),
  insertAssignment.run(g1, 'Writing', assignmentDate, 'Narrative Draft',          'Use the checklist',        25,  'Homework'),
  insertAssignment.run(g1, 'Social Studies', assignmentDate, 'Map Labeling',     'Label all regions',        20,  'Homework'),
  insertAssignment.run(g1, 'Art',     assignmentDate, 'Color Wheel Practice',     null,                       15,  'Project'),
].map(r => r.lastInsertRowid);

const g1AssignmentMeta = [
  { id: g1Assignments[0], max: 20 },
  { id: g1Assignments[1], max: 100 },
  { id: g1Assignments[2], max: 100 },
  { id: g1Assignments[3], max: 30 },
  { id: g1Assignments[4], max: 100 },
  { id: g1Assignments[5], max: 25 },
  { id: g1Assignments[6], max: 20 },
  { id: g1Assignments[7], max: 15 },
];

const g2Assignments = [
  insertAssignment.run(g2, 'Math',    assignmentDate, 'Fractions Worksheet',      'Pages 12–13',             20,  'Homework'),
  insertAssignment.run(g2, 'Math',    assignmentDate, 'Fractions Quiz',           null,                      100, 'Quiz'),
  insertAssignment.run(g2, 'Reading', assignmentDate, 'Comprehension – Chapter 4', 'Answer all 10 questions', 50, 'Homework'),
  insertAssignment.run(g2, 'Writing', assignmentDate, 'Personal Narrative Essay', 'Min 3 paragraphs',        100, 'Project'),
  insertAssignment.run(g2, 'Math',    assignmentDate, 'Mid-Term Exam',            null,                      100, 'Exam'),
  insertAssignment.run(g2, 'Science', assignmentDate, 'Matter Sorting Lab',       'Sort each item correctly',  25,  'Homework'),
  insertAssignment.run(g2, 'Social Studies', assignmentDate, 'State Symbols Quiz', null,                      40,  'Quiz'),
  insertAssignment.run(g2, 'Art',     assignmentDate, 'Self-Portrait Sketch',     'Add color if time allows',  20,  'Project'),
].map(r => r.lastInsertRowid);

const g2AssignmentMeta = [
  { id: g2Assignments[0], max: 20 },
  { id: g2Assignments[1], max: 100 },
  { id: g2Assignments[2], max: 50 },
  { id: g2Assignments[3], max: 100 },
  { id: g2Assignments[4], max: 100 },
  { id: g2Assignments[5], max: 25 },
  { id: g2Assignments[6], max: 40 },
  { id: g2Assignments[7], max: 20 },
];

// ── Assignment Scores ─────────────────────────────────────────────────────────

const insertScore = seed(
  `INSERT OR IGNORE INTO assignment_scores (assignment_id, student_id, score, exempt, late, note)
   VALUES (?, ?, ?, ?, ?, ?)`
);

function randomScore(max) {
  return Math.round((0.6 + Math.random() * 0.4) * max * 10) / 10;
}

function scoreForAssignment(max) {
  return randomScore(max);
}

for (const { id: assignId, max } of g1AssignmentMeta) {
  for (const { id: studentId } of g1Students) {
    const exempt = Math.random() < 0.05 ? 1 : 0;
    const late   = Math.random() < 0.1  ? 1 : 0;
    insertScore.run(assignId, studentId, exempt ? null : scoreForAssignment(max), exempt, late, null);
  }
}

for (const { id: assignId, max } of g2AssignmentMeta) {
  for (const { id: studentId } of g2Students) {
    const exempt = Math.random() < 0.05 ? 1 : 0;
    const late   = Math.random() < 0.1  ? 1 : 0;
    insertScore.run(assignId, studentId, exempt ? null : scoreForAssignment(max), exempt, late, null);
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
  ['Needs reminder to bring materials to class.',                 'attendance'],
  ['Completed reading task early and helped others.',            'positive'],
  ['Check in about handwriting legibility.',                      'referral'],
  ['Demonstrated strong problem solving on today\'s task.',       'positive'],
];

allStudents.forEach(({ id }, i) => {
  const t1 = noteTemplates[i % noteTemplates.length];
  const t2 = noteTemplates[(i + 4) % noteTemplates.length];
  insertNote.run(id, t1[0], t1[1]);
  insertNote.run(id, t2[0], t2[1]);
  if (i % 3 === 0) {
    const t3 = noteTemplates[(i + 8) % noteTemplates.length];
    insertNote.run(id, t3[0], t3[1]);
  }
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
