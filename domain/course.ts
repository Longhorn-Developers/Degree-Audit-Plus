export type CourseId = string;
export type Status = "Completed" | "In Progress" | "Not Started";
export type PlannableStatus = Status | "Planned";
export type SemesterSeason = "Fall" | "Spring" | "Summer";
export type Year = number;
export type StringSemester = `${SemesterSeason} ${Year}`;

export function getCurrentSemester(date = new Date()): StringSemester {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (month < 5) return `Spring ${year}`;
  if (month >= 8) return `Fall ${year}`;
  return `Summer ${year}`;
}

/** Chronological ordering comparator for two semesters (earliest first). */
export function sortSemesters(a: StringSemester, b: StringSemester): number {
  const seasonRank = (season: string) =>
    season === "Spring" ? 1 : season === "Summer" ? 2 : 3;
  const [seasonA, yearA] = a.split(" ");
  const [seasonB, yearB] = b.split(" ");

  const yearDiff = Number(yearA) - Number(yearB);
  if (yearDiff !== 0) return yearDiff;
  return seasonRank(seasonA) - seasonRank(seasonB);
}

/** The semester immediately following the given one. */
export function nextSemester(semester: StringSemester): StringSemester {
  const [season, year] = semester.split(" ") as [SemesterSeason, Year];
  switch (season) {
    case "Spring":
      return `Summer ${year}`;
    case "Summer":
      return `Fall ${year}`;
    case "Fall":
      return `Spring ${Number(year) + 1}`;
  }
}
export type CourseCompletionMethod =
  | "Transfer"
  | "Credit By Exam"
  | "In-Residence";
export type CourseCode = `${string} ${number}` | `${string} ${number}${string}`;

export interface Course {
  id: CourseId;
  code: CourseCode;
  name: string;
  hours: number;
  semester: StringSemester;
  grade?: string;
  status: PlannableStatus;
  type: CourseCompletionMethod;
}

export type PlannedCourseOutline = Omit<Course, "id" | "status"> & {
  status: "Planned";
};

export type CoreArea =
  | "First-Year Signature Course"
  | "Communication"
  | "Humanities"
  | "American and Texas Government"
  | "U.S. History"
  | "Social and Behavioral Sciences"
  | "Mathematics"
  | "Natural Science and Technology, Part I"
  | "Natural Science and Technology, Part II"
  | "Visual and Performing Arts";

// ------------------------------------------------------------ ut planner

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
