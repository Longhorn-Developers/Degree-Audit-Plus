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

/** Compares courses by department first, then course number, then letter if same number (408C vs 408D) */
export function compareCourseCodes(
  a: CourseCode | string,
  b: CourseCode | string,
): number {
  const left = parseCourseCode(a);
  const right = parseCourseCode(b);

  if (left.department !== right.department) {
    return left.department.localeCompare(right.department);
  }

  const leftNumber = Number.parseInt(left.number, 10);
  const rightNumber = Number.parseInt(right.number, 10);
  const leftIsNumeric = !Number.isNaN(leftNumber);
  const rightIsNumeric = !Number.isNaN(rightNumber);

  if (leftIsNumeric && rightIsNumeric && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;

  return left.number.localeCompare(right.number);
}

/** Extracts department and course number separately from full course name to use for comparison */
export function parseCourseCode(code: CourseCode | string): {
  department: string;
  number: string;
} {
  const trimmed = code.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { department: trimmed, number: "" };
  return {
    department: trimmed.slice(0, lastSpace),
    number: trimmed.slice(lastSpace + 1),
  };
}