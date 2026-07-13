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
