import type { CourseCode, SemesterSeason, StringSemester } from "./course";

// ut term code, 4 digit year then a season digit
export type Ccyys = string;

const CCYYS_SEASONS: Record<string, SemesterSeason> = {
  "2": "Spring",
  "6": "Summer",
  "9": "Fall",
};

export function ccyysToSemester(ccyys: Ccyys): StringSemester {
  const match = ccyys.match(/^(\d{4})([269])$/);
  if (!match) throw new PlannerError("PLANNER_PAGE_CHANGED");
  return `${CCYYS_SEASONS[match[2]]} ${Number(match[1])}`;
}

// the key from ut's delete link, always parse it never build it
// seq counts down from 999 every time a row gets added
export interface PlannerRowKey {
  courseId: string;
  ccyys: Ccyys;
  seq: string;
}

export function plannerCourseIdToCode(courseId: string): CourseCode {
  const department = courseId.slice(0, 3).trim();
  const number = courseId.slice(3).trim();
  return `${department} ${number}` as CourseCode;
}

export interface PlannedCourseRow {
  key: PlannerRowKey;
  courseType: string | null;
  code: CourseCode;
  title: string;
  notes: string;
  semester: StringSemester;
  expired: boolean;
}

export type PlannerErrorCode =
  | "AUTH_REQUIRED"
  | "PLANNER_FETCH_FAILED"
  | "PLANNER_PAGE_CHANGED";

export class PlannerError extends Error {
  constructor(readonly code: PlannerErrorCode) {
    super(code);
    this.name = "PlannerError";
  }
}
