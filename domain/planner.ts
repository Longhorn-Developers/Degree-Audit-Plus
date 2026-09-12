import type { CourseCode, SemesterSeason, StringSemester } from "./course";

// ut term code, 4 digit year then a season digit
export type Ccyys = string;

const CCYYS_SEASONS: Record<string, SemesterSeason> = {
  "2": "Spring",
  "6": "Summer",
  "9": "Fall",
};

const SEASON_DIGITS: Record<SemesterSeason, string> = {
  Spring: "2",
  Summer: "6",
  Fall: "9",
};

export function ccyysToSemester(ccyys: Ccyys): StringSemester | null {
  const match = ccyys.match(/^(\d{4})([269])$/);
  if (!match) return null;
  return `${CCYYS_SEASONS[match[2]]} ${Number(match[1])}`;
}

export function semesterToCcyys(semester: StringSemester): Ccyys {
  const [season, year] = semester.split(" ") as [SemesterSeason, string];
  return `${year}${SEASON_DIGITS[season]}`;
}

// the key from ut's delete link, always parse it never build it
// seq counts down from 999 every time a row gets added
export interface PlannerRowKey {
  courseId: string;
  ccyys: Ccyys;
  seq: string;
}

// ut's planner id is the dept padded to 3 chars then the number, "M  110C"
export function splitPlannerCourseId(courseId: string): {
  department: string;
  number: string;
} {
  return {
    department: courseId.slice(0, 3).trim(),
    number: courseId.slice(3).trim(),
  };
}

export function plannerCourseIdToCode(courseId: string): CourseCode {
  const { department, number } = splitPlannerCourseId(courseId);
  return `${department} ${number}` as CourseCode;
}

export function courseCodeToPlannerCourseId(
  department: string,
  number: string,
): string {
  return `${department.trim().padEnd(3)}${number.trim()}`;
}

export interface PlannedCourseRow {
  key: PlannerRowKey;
  courseType: string | null;
  code: CourseCode;
  title: string;
  notes: string;
  passFail: boolean;
  semester: StringSemester;
  expired: boolean;
}

// ut's course_type for a regular ut austin course
export const REGULAR_COURSE_TYPE = "1";

export interface PlannerCourseRequest {
  department: string;
  number: string;
  ccyys: Ccyys;
  courseType?: string;
  // "A" all (default), "L" lower division, "U" upper division, "G" grad
  level?: string;
}

// an add link copied straight off the page=3 listing, following it adds the
// course so never build one of these by hand
export interface PlannerAddLink {
  href: string;
  department: string;
  number: string;
  ccyys: Ccyys;
  topicId: string | null;
  code: CourseCode;
  title: string;
}

export type PlannerResolution =
  | { kind: "resolved"; link: PlannerAddLink }
  | { kind: "topics"; options: PlannerAddLink[] };

// what the planner should contain after a sync
// one target per course and term, planner rows dont record the topic so two
// topics of the same course in one term cant be told apart
export interface PlannerSyncTarget extends PlannerCourseRequest {
  topicId?: string | null;
}

export type PlannerErrorCode =
  | "AUTH_REQUIRED"
  | "PLANNER_FETCH_FAILED"
  | "PLANNER_PAGE_CHANGED"
  | "COURSE_NOT_FOUND"
  | "ROW_NOT_FOUND"
  | "DUPLICATE_ROW"
  | "TOPIC_REQUIRED"
  | "WRITE_NOT_VERIFIED";

export class PlannerError extends Error {
  constructor(readonly code: PlannerErrorCode) {
    super(code);
    this.name = "PlannerError";
  }
}
