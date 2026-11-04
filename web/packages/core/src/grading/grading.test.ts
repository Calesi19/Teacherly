import { describe, expect, it } from "vitest";

import { ValidationError } from "../domain/errors";
import {
  DEFAULT_GRADING_SCALE,
  averageForAssessment,
  createGradingScale,
  gradeAssessmentForStudent,
  gradeClassForStudent,
  gradeClassForStudents,
  isExactScore,
  letterFor,
  percentageOf,
  reportForAssessment,
  type GradableAssessment,
  type GradableGrade,
} from "./index";

/**
 * The formula, pinned.
 *
 * This file is the specification for the one grading implementation that
 * replaces the desktop app's three. Where a case differs from what the desktop
 * app prints today, the old number is named in a comment with the file it comes
 * from, so a reader can tell a deliberate change from a regression.
 *
 * THE THREE OLD IMPLEMENTATIONS, as they exist in the Tauri app at the repo
 * root. All three are retired by this module.
 *
 *   (OLD-1) `src/hooks/useAssignmentDetail.ts`, `computeStats`:
 *           `graded.reduce((acc, s) => acc + s.score, 0) / gradedCount`
 *           — a mean of RAW POINTS, not a percentage. It honours `exempt`
 *           (`filter(s => s.score !== null && !s.exempt)`). Drives the
 *           assignment detail screen's "average".
 *
 *   (OLD-2) `src/reports/fetchStudentReportData.ts`, `fetchStudentCourseSummary`:
 *           `SUM(s.score) / SUM(CASE WHEN s.score IS NOT NULL THEN a.max_score ELSE 0 END)`
 *           — points-based, but with NO `exempt` filter anywhere in the query.
 *           Its letter comes from `StudentGradeSummarySection.gradeLetter`,
 *           which compares the UNROUNDED ratio against a hard-coded 90/80/70/60.
 *           **This is the one that drives the PDF that goes home to parents.**
 *
 *   (OLD-3) `src/pages/student-profile/OverviewTab.tsx`, `gradesByClass`:
 *           sums `score` and `max_score` over `assignments.filter(a => a.score !== null)`
 *           — also ignoring `exempt` — then displays it through
 *           `formatScorePercentage`, which FLOORS to one decimal
 *           (`Math.floor((value + Number.EPSILON) * 10) / 10`).
 *
 * The decided behaviour, against which every case below is asserted:
 *   - `sum(score) / sum(max_score)` over non-exempt, scored rows;
 *   - exempt leaves the numerator AND the denominator;
 *   - rounded half-up to 2 decimals exactly once, and the letter is read off
 *     that rounded number;
 *   - `late` never affects a grade;
 *   - cutoffs come from the class.
 */

const SCALE = DEFAULT_GRADING_SCALE;

/** `max_score` 100 unless a case is about weighting. */
function assessment(id: string, maxScore = 100): GradableAssessment {
  return { id, maxScore };
}

function grade(
  assessmentId: string,
  score: number | null,
  flags: { exempt?: boolean; late?: boolean } = {},
): GradableGrade {
  return {
    assessmentId,
    studentId: "s1",
    score,
    exempt: flags.exempt ?? false,
    late: flags.late ?? false,
  };
}

/** One student, the whole class. The shape most cases below want. */
function classGrade(assessments: GradableAssessment[], grades: GradableGrade[]) {
  return gradeClassForStudent(SCALE, assessments, grades, "s1");
}

/* ===========================================================================
 * 1. Exempt leaves both sides of the fraction.
 * ======================================================================== */

describe("exempt is excluded entirely", () => {
  it("removes an exempt assessment from the numerator and the denominator", () => {
    const result = classGrade(
      [assessment("a1"), assessment("a2")],
      [grade("a1", 80), grade("a2", 0, { exempt: true })],
    );

    // 80 / 100 — the exempt assessment's 100 points are not in the denominator.
    expect(result.percentage).toBe(80);
    expect(result.letter).toBe("B");
    expect(result.totals).toEqual({
      pointsEarned: 80,
      pointsPossible: 100,
      counted: 1,
      exempt: 1,
      ungraded: 0,
    });

    // OLD-2 (the PDF): no `exempt` filter, and `score = 0` is NOT NULL, so the
    // exempt row contributed 0 points out of 100 — 80/200 = 40%, an F.
    // OLD-3 (the profile screen): identical, 40.0%, also an F.
    // A teacher who excused an assessment was lowering the student's grade.
  });

  it("keeps an exempt row out even when it carries a score", () => {
    // A teacher scored it, then excused it. The score is a record, not a grade.
    const result = classGrade([assessment("a1")], [grade("a1", 95, { exempt: true })]);

    expect(result.percentage).toBeNull();
    expect(result.letter).toBeNull();
    expect(result.totals.counted).toBe(0);
    expect(result.totals.exempt).toBe(1);

    // OLD-2/OLD-3 both counted it: 95/100 = 95%, an A. The exemption was
    // ignored in the direction that happened to help here, and hurt above —
    // which is the real problem: the old answer depended on the score.
  });

  it("has no percentage at all when every assessment is exempt", () => {
    const result = classGrade(
      [assessment("a1"), assessment("a2")],
      [grade("a1", 0, { exempt: true }), grade("a2", 0, { exempt: true })],
    );

    // The empty-denominator question, answered: `null`, not 0.
    //
    // A student whose every assessment was excused has no percentage — there is
    // nothing to take a percentage *of*. Returning 0 would be a claim that they
    // earned none of the points available to them, when no points were.
    expect(result.percentage).toBeNull();
    expect(result.letter).toBeNull();
    expect(result.totals).toEqual({
      pointsEarned: 0,
      pointsPossible: 0,
      counted: 0,
      exempt: 2,
      ungraded: 0,
    });

    // OLD-2 (the PDF): 0 / 200 = 0%, printed as an F and posted to parents.
    // OLD-3: `formatScorePercentage` guards `maxScore <= 0` -> "0.0" — but
    // reaches the sum with maxScore 200 here, so also 0.0% and an F.
    //
    // THIS IS THE SINGLE MOST VISIBLE CHANGE IN THIS CHUNK: a fully-excused
    // student goes from an F on a parent-facing report to "no grade yet".
  });

  it("distinguishes exempt from ungraded in the totals, though both are excluded", () => {
    const result = classGrade(
      [assessment("a1"), assessment("a2"), assessment("a3")],
      [grade("a1", 50), grade("a2", null, { exempt: true })],
    );

    // Both leave the fraction; the teacher still needs to see which is which.
    // "I excused this" and "I have not marked this" are different facts.
    expect(result.percentage).toBe(50);
    expect(result.totals.exempt).toBe(1);
    expect(result.totals.ungraded).toBe(1);
  });
});

/* ===========================================================================
 * 2. Points, not a mean of percentages — the weighting change.
 * ======================================================================== */

describe("a 100-point exam against a 10-point quiz", () => {
  const exam = assessment("exam", 100);
  const quiz = assessment("quiz", 10);

  it("weighs the exam ten times the quiz", () => {
    // Half marks on the exam, full marks on the quiz.
    const result = classGrade([exam, quiz], [grade("exam", 50), grade("quiz", 10)]);

    // 60 / 110 = 54.5454...% -> 54.55%.
    expect(result.percentage).toBe(54.55);
    expect(result.letter).toBe("F");
    expect(result.totals.pointsEarned).toBe(60);
    expect(result.totals.pointsPossible).toBe(110);

    // The warned-about change, stated plainly:
    //
    //   - A MEAN OF PERCENTAGES — what a teacher who has only ever seen the
    //     per-assignment percentages on screen is likely to expect — would be
    //     (50% + 100%) / 2 = 75%, a C. This module does not do that, by
    //     decision: 54.55% and an F.
    //   - OLD-1 (`computeStats`) would report (50 + 10) / 2 = 30 — thirty
    //     *points*, a number that is neither a percentage nor comparable
    //     between two assessments with different `max_score`. It was shown
    //     beside a 90/80/70/60 band table.
    //   - OLD-2/OLD-3 agree with this module here (60/110), because nothing in
    //     this case is exempt. They differ only in the rounding, below.
  });

  it("gives the same answer whichever order the assessments arrive in", () => {
    const forward = classGrade([exam, quiz], [grade("exam", 33.33), grade("quiz", 7.5)]);
    const reversed = classGrade([quiz, exam], [grade("quiz", 7.5), grade("exam", 33.33)]);

    // Totals are accumulated as integer hundredths, so a float summation order
    // cannot move the result. 40.83 / 110 = 37.1181...% -> 37.12%.
    expect(forward.percentage).toBe(37.12);
    expect(reversed.percentage).toBe(forward.percentage);
  });
});

/* ===========================================================================
 * 3. A missing row and a zero score are different grades.
 * ======================================================================== */

describe("missing grades versus zero grades", () => {
  const two = [assessment("a1"), assessment("a2")];

  it("leaves an unmarked assessment out of the denominator", () => {
    const result = classGrade(two, [grade("a1", 80)]);

    // No row for a2: 80 / 100 = 80%.
    expect(result.percentage).toBe(80);
    expect(result.letter).toBe("B");
    expect(result.totals.ungraded).toBe(1);
  });

  it("counts a zero as marked, and in the denominator", () => {
    const result = classGrade(two, [grade("a1", 80), grade("a2", 0)]);

    // 80 / 200 = 40%. Same first score as the case above, two letters apart,
    // and the only difference is whether a2 was marked.
    expect(result.percentage).toBe(40);
    expect(result.letter).toBe("F");
    expect(result.totals.ungraded).toBe(0);
    expect(result.totals.counted).toBe(2);
  });

  it("treats a scoreless row as unmarked, not as a zero", () => {
    // A row exists to carry `late`, but no score has been entered.
    const result = classGrade(two, [grade("a1", 80), grade("a2", null, { late: true })]);

    // Identical to having no row at all: 80 / 100 = 80%.
    expect(result.percentage).toBe(80);
    expect(result.totals.ungraded).toBe(1);
    expect(result.totals.counted).toBe(1);

    // Nothing in this module coerces `null` to 0 — which is precisely what a
    // `COALESCE(score, 0)` in a query would have done, turning every unmarked
    // assessment in the class into a zero.
  });

  it("reports an all-unmarked class as having no grade rather than 0%", () => {
    const result = classGrade(two, []);

    expect(result.percentage).toBeNull();
    expect(result.letter).toBeNull();
    expect(result.totals.ungraded).toBe(2);
  });
});

/* ===========================================================================
 * 4. Rounding, once, and the letter read off the rounded number.
 * ======================================================================== */

describe("the rounding boundary that decides a letter", () => {
  it("rounds 89.995% up to 90.00% and awards the A", () => {
    // 179.99 out of 200 = 89.995% exactly.
    const result = classGrade([assessment("a1", 200)], [grade("a1", 179.99)]);

    expect(result.percentage).toBe(90);
    // The letter follows the rounded number, so the displayed "90.00%" and the
    // awarded "A" cannot disagree. This is the whole reason the module exists.
    expect(result.letter).toBe("A");

    // OLD-2 (the PDF): `gradeLetter` compared the UNROUNDED 89.995 against 90
    // and printed a B — beside a percentage that `formatScorePercentage` had
    // floored to "89.9". So the PDF was self-consistent and wrong.
    // OLD-3 (the screen): floors to 89.9 -> also a B.
    //
    // A teacher told "round half up to two decimals" gets 90.00 and an A.
  });

  it("does not round a hair below the boundary up", () => {
    // 179.98 / 200 = 89.99%.
    const result = classGrade([assessment("a1", 200)], [grade("a1", 179.98)]);

    expect(result.percentage).toBe(89.99);
    expect(result.letter).toBe("B");
  });

  it("rounds half up rather than to even, and not through a float multiply", () => {
    // 1.005 is the canonical case: `Math.round(1.005 * 100) / 100` is 1,
    // because `1.005 * 100` is 100.49999999999999, and `(1.005).toFixed(2)`
    // is "1.00". Half-up says 1.01.
    //
    // 20.1 / 2000 = 1.005%.
    expect(percentageOf(20.1, 2000)).toBe(1.01);
  });

  it("awards the A at exactly the cutoff", () => {
    const result = classGrade([assessment("a1")], [grade("a1", 90)]);
    expect(result.percentage).toBe(90);
    expect(result.letter).toBe("A");
  });

  it("rounds a repeating ratio half-up at the second decimal", () => {
    // 2 / 3 = 66.666...% -> 66.67%.
    const result = classGrade([assessment("a1", 3)], [grade("a1", 2)]);
    expect(result.percentage).toBe(66.67);
    expect(result.letter).toBe("D");

    // OLD-3 floors to one decimal: "66.6". The rounded 66.67 is the number
    // both the screen and any future PDF now show.
  });

  it("returns a percentage above 100 when a student scores above max", () => {
    // Extra credit, entered as a score over `max_score`. Not rejected here —
    // the formula reports what the points say, and the letter follows.
    const result = classGrade([assessment("a1", 50)], [grade("a1", 55)]);
    expect(result.percentage).toBe(110);
    expect(result.letter).toBe("A");
  });
});

/* ===========================================================================
 * 5. `late` is recorded, reported, and never scored.
 * ======================================================================== */

describe("the late flag never affects a grade", () => {
  it("scores a late assessment exactly as an on-time one", () => {
    const onTime = classGrade([assessment("a1")], [grade("a1", 75)]);
    const late = classGrade([assessment("a1")], [grade("a1", 75, { late: true })]);

    expect(late.percentage).toBe(onTime.percentage);
    expect(late.letter).toBe(onTime.letter);
    expect(late.percentage).toBe(75);
  });

  it("still reports the flag on the assessment result", () => {
    const result = gradeAssessmentForStudent(
      SCALE,
      assessment("a1"),
      "s1",
      grade("a1", 75, { late: true }),
    );

    expect(result.late).toBe(true);
    expect(result.percentage).toBe(75);
    expect(result.status).toBe("graded");
  });

  it("reports the flag on a row that is both late and exempt", () => {
    const result = gradeAssessmentForStudent(
      SCALE,
      assessment("a1"),
      "s1",
      grade("a1", 40, { late: true, exempt: true }),
    );

    // Exempt wins for scoring; `late` survives as a fact about the submission.
    expect(result.status).toBe("exempt");
    expect(result.percentage).toBeNull();
    expect(result.late).toBe(true);
    expect(result.score).toBe(40);
  });
});

/* ===========================================================================
 * 6. The per-class scale.
 * ======================================================================== */

describe("the grading scale is a validated per-class value", () => {
  it("defaults a new class to 90/80/70/60", () => {
    expect(createGradingScale()).toEqual({ a: 90, b: 80, c: 70, d: 60 });
    expect(createGradingScale({})).toEqual(DEFAULT_GRADING_SCALE);
  });

  it("takes the default for any omitted cutoff", () => {
    expect(createGradingScale({ a: 93 })).toEqual({ a: 93, b: 80, c: 70, d: 60 });
  });

  it("gives a different letter for the same percentage on a stricter scale", () => {
    const strict = createGradingScale({ a: 93, b: 85, c: 77, d: 70 });
    const assessments = [assessment("a1")];
    const grades = [grade("a1", 91)];

    expect(gradeClassForStudent(DEFAULT_GRADING_SCALE, assessments, grades, "s1").letter).toBe("A");
    expect(gradeClassForStudent(strict, assessments, grades, "s1").letter).toBe("B");

    // The desktop app hard-codes 90/80/70/60 in six places, so this is not a
    // thing a teacher there can change. Nothing in this module mentions those
    // four numbers outside `DEFAULT_GRADING_SCALE`.
  });

  it("refuses a scale whose bands are not strictly descending", () => {
    expect(() => createGradingScale({ a: 80, b: 90 })).toThrow(ValidationError);
    // Equal cutoffs would leave two letters claiming the same percentage.
    expect(() => createGradingScale({ a: 90, b: 90 })).toThrow(ValidationError);
  });

  it("refuses a cutoff outside 0–100", () => {
    expect(() => createGradingScale({ a: 101 })).toThrow(ValidationError);
    expect(() => createGradingScale({ d: -1 })).toThrow(ValidationError);
  });

  it("refuses a D cutoff of 0, which would make F unearnable", () => {
    // At D = 0 the F band is [0, 0) — a letter no score can land in.
    expect(() => createGradingScale({ d: 0 })).toThrow(ValidationError);
  });

  it("refuses a cutoff finer than the numeric(5,2) column can store", () => {
    expect(() => createGradingScale({ a: 89.995 })).toThrow(ValidationError);
  });

  it("names the offending field on each issue", () => {
    try {
      createGradingScale({ a: 101, d: -1 });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues).toEqual([
        { field: "gradingScale.a", code: "out_of_range" },
        { field: "gradingScale.d", code: "out_of_range" },
      ]);
    }
  });

  it("covers 0–100 with no gap: every percentage gets exactly one letter", () => {
    const scale = createGradingScale();
    // Every hundredth from 0.00 to 100.00 lands in a band, and the bands are
    // the expected ones at every boundary.
    for (let hundredths = 0; hundredths <= 10_000; hundredths += 1) {
      const percentage = hundredths / 100;
      const letter = letterFor(scale, percentage);
      const expected =
        percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F";
      if (letter !== expected) {
        // Fail with the value rather than a bare `false`.
        expect({ percentage, letter }).toEqual({ percentage, letter: expected });
      }
    }
  });
});

/* ===========================================================================
 * 7. One assessment, one student — and the class average over the same path.
 * ======================================================================== */

describe("a single assessment result", () => {
  it("reports an unmarked pair as ungraded with no percentage", () => {
    const result = gradeAssessmentForStudent(SCALE, assessment("a1"), "s1", undefined);

    expect(result.status).toBe("ungraded");
    expect(result.score).toBeNull();
    expect(result.percentage).toBeNull();
    expect(result.letter).toBeNull();
    expect(result.late).toBe(false);
  });

  it("rounds a single assessment through the same path as a whole class", () => {
    // 17 / 20 = 85%, asked both ways.
    const single = gradeAssessmentForStudent(SCALE, assessment("a1", 20), "s1", grade("a1", 17));
    const whole = classGrade([assessment("a1", 20)], [grade("a1", 17)]);

    expect(single.percentage).toBe(85);
    expect(single.percentage).toBe(whole.percentage);
    expect(single.letter).toBe(whole.letter);
  });
});

describe("the class average on one assessment", () => {
  const exam = assessment("exam", 50);
  const roster = ["s1", "s2", "s3"];

  function gradeFor(studentId: string, score: number | null, exempt = false): GradableGrade {
    return { assessmentId: "exam", studentId, score, exempt, late: false };
  }

  it("averages over the students who were marked", () => {
    const average = averageForAssessment(
      SCALE,
      exam,
      [gradeFor("s1", 50), gradeFor("s2", 25)],
      roster,
    );

    // 75 / 100 = 75%. s3 has no row and is ungraded, so their 50 points are
    // not in the denominator.
    expect(average.percentage).toBe(75);
    expect(average.letter).toBe("C");
    expect(average.totals).toEqual({
      pointsEarned: 75,
      pointsPossible: 100,
      counted: 2,
      exempt: 0,
      ungraded: 1,
    });

    // OLD-1 (`computeStats`) reported (50 + 25) / 2 = 37.5 — raw points, which
    // happens to be half of this assessment's max and looks like a failing
    // percentage next to the 90/80/70/60 table it was displayed beside.
  });

  it("drops an exempt student from the class average", () => {
    const average = averageForAssessment(
      SCALE,
      exam,
      [gradeFor("s1", 50), gradeFor("s2", 0, true), gradeFor("s3", 40)],
      roster,
    );

    // 90 / 100 = 90%. s2's exemption takes their 50 points out of the
    // denominator rather than averaging in a zero.
    expect(average.percentage).toBe(90);
    expect(average.letter).toBe("A");
    expect(average.totals.counted).toBe(2);
    expect(average.totals.exempt).toBe(1);
  });

  it("has no average when nobody has been marked", () => {
    const average = averageForAssessment(SCALE, exam, [], roster);
    expect(average.percentage).toBeNull();
    expect(average.letter).toBeNull();
    expect(average.totals.ungraded).toBe(3);
  });

  it("matches the mean of the individual percentages, because max_score is shared", () => {
    const grades = [gradeFor("s1", 45), gradeFor("s2", 30), gradeFor("s3", 15)];
    const report = reportForAssessment(SCALE, exam, grades, roster);

    // 90 / 150 = 60%.
    expect(report.average.percentage).toBe(60);
    // And each student's own percentage, from the same rounding path.
    expect(report.results.map((r) => r.percentage)).toEqual([90, 60, 30]);
    // (90 + 60 + 30) / 3 = 60. The class average and the per-student numbers
    // cannot tell different stories, because they are one formula.
    expect(report.average.percentage).toBe((90 + 60 + 30) / 3);
  });

  it("reports every student on the roster, including the unmarked ones", () => {
    const report = reportForAssessment(SCALE, exam, [gradeFor("s1", 50)], roster);

    expect(report.results).toHaveLength(3);
    expect(report.results.map((r) => r.status)).toEqual(["graded", "ungraded", "ungraded"]);
  });
});

/* ===========================================================================
 * 8. The roster helper is the same formula, not a second one.
 * ======================================================================== */

describe("gradeClassForStudents", () => {
  it("agrees with gradeClassForStudent for every student", () => {
    const assessments = [assessment("a1", 100), assessment("a2", 10)];
    const grades: GradableGrade[] = [
      { assessmentId: "a1", studentId: "s1", score: 91, exempt: false, late: false },
      { assessmentId: "a2", studentId: "s1", score: 3, exempt: false, late: true },
      { assessmentId: "a1", studentId: "s2", score: 0, exempt: false, late: false },
      { assessmentId: "a2", studentId: "s2", score: 10, exempt: true, late: false },
    ];
    const roster = ["s1", "s2", "s3"];

    const batch = gradeClassForStudents(SCALE, assessments, grades, roster);
    const individually = roster.map((id) =>
      gradeClassForStudent(SCALE, assessments, grades, id),
    );

    expect(batch).toEqual(individually);

    // s1: 94 / 110 = 85.4545...% -> 85.45%, a B. The late flag changed nothing.
    expect(batch[0]?.percentage).toBe(85.45);
    expect(batch[0]?.letter).toBe("B");
    // s2: a1 is a zero and counts; a2 is exempt and does not. 0 / 100 = 0%.
    expect(batch[1]?.percentage).toBe(0);
    expect(batch[1]?.letter).toBe("F");
    // s3 has no rows at all.
    expect(batch[2]?.percentage).toBeNull();
  });

  it("returns a zero percentage, not null, for a student who earned nothing", () => {
    // The distinction that matters against the all-exempt case above: this
    // student was marked and earned 0 of 100 available points. That is 0%, an
    // F, and a real grade. `null` is reserved for "no points were available".
    const result = classGrade([assessment("a1")], [grade("a1", 0)]);
    expect(result.percentage).toBe(0);
    expect(result.letter).toBe("F");
    expect(result.totals.counted).toBe(1);
  });
});

/* ===========================================================================
 * 9. Inputs the exact arithmetic refuses.
 * ======================================================================== */

describe("precision guards", () => {
  it("accepts scores at the precision the numeric(10,2) columns hold", () => {
    expect(isExactScore(0)).toBe(true);
    expect(isExactScore(33.33)).toBe(true);
    expect(isExactScore(100)).toBe(true);
  });

  it("rejects a score finer than two decimals", () => {
    // A third decimal means a caller computed a value instead of reading one.
    expect(isExactScore(33.333)).toBe(false);
    expect(isExactScore(89.995)).toBe(false);
  });

  it("rejects values that are not finite numbers", () => {
    expect(isExactScore(Number.NaN)).toBe(false);
    expect(isExactScore(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("rejects an exponential-notation value rather than misreading it", () => {
    // `String(1e-9)` is "1e-9"; read as a fixed-point string that would be 1.
    expect(isExactScore(1e-9)).toBe(false);
  });

  it("throws rather than silently rounding a three-decimal score in the formula", () => {
    expect(() => classGrade([assessment("a1")], [grade("a1", 33.333)])).toThrow(
      /at most 2 decimal places/,
    );
  });

  it("has no percentage for a zero denominator", () => {
    expect(percentageOf(0, 0)).toBeNull();
  });
});
