import { describe, expect, test } from "bun:test";
import {
  findPlannerRowsForCourse,
  isDeletableCourse,
  type Course,
  type CourseCode,
  type PlannableStatus,
  type PlannedCourseRow,
} from "../../domain/course";

function row(code: string, ccyys: string, seq = "999"): PlannedCourseRow {
  return {
    key: { courseId: code.replace(" ", "  "), ccyys, seq },
    courseType: "1",
    code: code as CourseCode,
    title: code,
    notes: "",
    passFail: false,
    semester: "Fall 2026",
    expired: false,
  };
}

describe("findPlannerRowsForCourse", () => {
  test("matches the code in the course's semester", () => {
    const rows = [row("CS 303E", "20269"), row("CS 303E", "20272", "998")];
    expect(findPlannerRowsForCourse(rows, "CS 303E", "Spring 2027")).toEqual([
      rows[1],
    ]);
  });

  test("ignores spacing and case in the code", () => {
    const rows = [row("CS 303E", "20269")];
    expect(findPlannerRowsForCourse(rows, "cs303e", "Fall 2026")).toEqual(rows);
  });

  test("falls back to the only row for a course moved to another semester", () => {
    const rows = [row("CS 303E", "20269"), row("DES 326", "20269", "998")];
    expect(findPlannerRowsForCourse(rows, "CS 303E", "Spring 2027")).toEqual([
      rows[0],
    ]);
  });

  test("won't guess between several rows in other semesters", () => {
    const rows = [row("CS 303E", "20269"), row("CS 303E", "20276", "998")];
    expect(findPlannerRowsForCourse(rows, "CS 303E", "Spring 2027")).toEqual(
      [],
    );
  });

  test("finds nothing for a course not on the planner", () => {
    expect(
      findPlannerRowsForCourse(
        [row("DES 326", "20269")],
        "CS 303E",
        "Fall 2026",
      ),
    ).toEqual([]);
  });
});

describe("isDeletableCourse", () => {
  const course = (status: PlannableStatus, future?: boolean): Course => ({
    id: "1",
    code: "CS 303E",
    name: "Elements of Computing",
    hours: 3,
    semester: "Fall 2026",
    status,
    type: "In-Residence",
    ...(future ? { future } : {}),
  });

  test("only planner courses can be deleted", () => {
    expect(isDeletableCourse(course("Planned"))).toBe(true);
    expect(isDeletableCourse(course("Planned", true))).toBe(false);
    expect(isDeletableCourse(course("In Progress"))).toBe(false);
    expect(isDeletableCourse(course("Completed"))).toBe(false);
    expect(isDeletableCourse(undefined)).toBe(false);
  });
});
