import type { UniqueIdentifier } from "@dnd-kit/core";

/**
 * A unique identifier for each course. Is shared between the course object and the requirement rule object.
 */
export type CourseId = UniqueIdentifier;

/**
 * A progress object.
 */
export type Progress = {
  current: number;
  total: number;
};

/**
 * A progress object for a planned course.
 */
export type PlanableProgress = {
  current: number;
  planned: number;
  total: number;
};

/**
 * The progress of an audit. Note that it keeps track of both the current and planned progress separately.
 */
export type CurrentAuditProgress = {
  total: PlanableProgress;
  sections: {
    title: string;
    progress: PlanableProgress;
  }[];
};

/**
 * The data that is cached for an audit. One of these is stored per auditId.
 * Broken into requirements which explains where course credits are used and
 * courses which contains all the courses in the audit as a simple list.
 */
export interface CachedAuditData {
  // Display name used when this audit is shown inside a composite view.
  name?: string;
  requirements: AuditRequirement[];
  courses: Record<CourseId, Course>;
}

// Holds multiple audits together so planner views can read all requirements at once.
export interface CompositeAuditData {
  audits: CachedAuditData[];
}

// A persisted composite. Stores only a name + the member audit ids; it does NOT cache audit
// data. The full CompositeAuditData is rebuilt on demand from the per-audit cache
// (auditData_<id>) so it never goes stale when planned courses change or audits re-scrape.
export interface CachedCompositeAudit {
  id: string; // crypto.randomUUID()
  name: string; // user-facing label, e.g. "My Degree Plan"
  auditIds: string[]; // ordered member ids -> point into auditData_<id>
}

/**
 * Simple way of expanding an object type one layer so it shows its children's contents
 */
export type ExpandOut<T> = T extends infer R ? { [K in keyof R]: R[K] } : never;
/**
 * Override a field in a type with a new type. Useful for when you want to ensure a field is a specific type or value.
 */
export type Ensure<T, R> = ExpandOut<Omit<T, keyof R> & R>;

/**
 * A course outline to add that is going to be planned. So, it doesn't have an id field and the status is forcibly "Planned".
 */
export type PlannedCourseOutline = ExpandOut<
  Omit<Ensure<Course, { status: "Planned" }>, "id">
>;

/**
 * The status of a course or a more general audit requirement
 */
export type Status = "Completed" | "In Progress" | "Not Started";

/**
 * A status that can be planned.
 */
export type PlannableStatus = Status | "Planned";

export type RequirementProgressUnit = "hours" | "courses";

/**
 * A specific rule within a larger requirement section.
 */
export type RequirementRule = {
  text: string;
  requiredHours: number;
  appliedHours: number;
  remainingHours: number;
  progressUnit: RequirementProgressUnit;
  status: Status;
  courses: CourseId[];
};

/**
 * A requirement within an audit. For instance, "Core Requirements" or "Major Requirements".
 */
export type AuditRequirement = {
  title: string;
  rules: RequirementRule[];
};

// Used by the audit provider after combining CompositeAuditData requirements for the existing UI.
export type CompositeAuditRequirement = AuditRequirement & {
  // Keeps each flattened requirement tied back to the audit it came from.
  auditName: string;
  // Lets planner/requirement UI flag repeated courses without deduping them.
  duplicateCourseCodes: CourseCode[];
};

// Used by audit-calculations helpers to report courses shared across multiple audits.
export type DuplicateCourseRequirementFlag = {
  // Course code is used instead of course id because each audit has its own ids.
  courseCode: CourseCode;
  // The audit names where this course appears in requirements.
  auditNames: string[];
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

export type SemesterSeason = "Fall" | "Spring" | "Summer";
export type Year = number;

/**
 * A semester in the format of "Fall 2025" or "Spring 2026".
 */
export type StringSemester = `${SemesterSeason} ${Year}`;

/**
 * The completion method of a course. AKA, how the course was completed.
 */
export type CourseCompletionMethod =
  | "Transfer"
  | "Credit By Exam"
  | "In-Residence";

export type CourseCode = `${string} ${number}` | `${string} ${number}${string}`;

/**
 * All the information about a course. Everything is grabbed from scraping except the id which is a custom UUID.
 */
export type Course = {
  id: CourseId;
  code: CourseCode;
  name: string;
  hours: number;
  semester: StringSemester;
  grade?: string;
  status: PlannableStatus;
  type: CourseCompletionMethod;
};

/**
 * A course instructor entry from the UT course catalog export.
 */
export type CatalogInstructor = {
  fullName: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
};

/**
 * A single meeting time/location entry from the UT course catalog export.
 */
export type CatalogCourseScheduleEntry = {
  days: string;
  hours: string;
  location: string;
};

/**
 * Semester metadata from the UT course catalog export.
 */
export type CatalogSemester = {
  year: Year;
  season: SemesterSeason;
  code: string;
};

/**
 * The full catalog-course JSON shape stored in assets/ut-courses.json and persisted to IndexedDB.
 */
export type CatalogCourse = {
  uniqueId: number;
  fullName: string;
  courseName: string;
  department: string;
  number: string;
  creditHours: number;
  status: string;
  isReserved: boolean;
  instructionMode: string;
  instructors: CatalogInstructor[];
  schedule: CatalogCourseScheduleEntry[];
  flags: string[];
  core: string[];
  url: string;
  description: string[];
  semester: CatalogSemester;
  scrapedAt: number;
};

export interface DegreeAuditCardProps {
  title?: string;
  majors?: string[];
  minors?: string[];
  percentage?: number;
  auditId?: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onMenuClick?: () => void;
  onRename?: (title: string) => void;
}

export interface AuditHistoryData {
  audits: DegreeAuditCardProps[];
  timestamp: number;
  error?: string;
  auditNumber?: number;
  // Track which audits have been scraped and cached
  scrapedAuditIds?: string[];
}
