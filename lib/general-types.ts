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

/**
 * The outcome of checking whether a CatalogCourse satisfies a plan requirement rule.
 * - "fulfills"     – course satisfies an identified rule; carries requirementTitle + ruleTitle
 *                    needed by addPlannedCourse(), plus a display message.
 * - "no-match"     – course was checked but does not fulfill any outstanding rule.
 * - "check-failed" – check could not complete (missing data, error); carries a reason string.
 */
export type CourseRequirementFit =
  | {
      kind: "fulfills";
      requirementTitle: string;
      ruleTitle: string;
      message: string;
    }
  | { kind: "no-match"; message: string }
  | { kind: "check-failed"; reason: string };

/**
 * The current state of the requirement-fit check in the course-add panel.
 * - "idle"     – no course selected; nothing to show.
 * - "checking" – async check is in flight.
 * - "resolved" – check complete; result carries the CourseRequirementFit outcome.
 */
export type PlanRequirementValidationState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "resolved"; result: CourseRequirementFit };

export function isValidationChecking(
  state: PlanRequirementValidationState,
): boolean {
  return state.status === "checking";
}

export function isCourseRequirementFulfilled(
  fit: CourseRequirementFit,
): fit is Extract<CourseRequirementFit, { kind: "fulfills" }> {
  return fit.kind === "fulfills";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Plan requirement validation state (DAP-84 / 6.4)
 *
 * Every requirement in a degree plan carries two INDEPENDENT dimensions:
 *   1. its validation result – what the last check found.
 *   2. its staleness         – whether the plan changed since that check.
 * They are tracked separately (not one enum) so "was confirmed, now stale" stays
 * distinguishable from "was failed, now stale".
 *
 * Distinct from PlanRequirementValidationState above, which is the course-add
 * panel's transient async UI state (idle / checking / resolved).
 * ────────────────────────────────────────────────────────────────────────── */

/** Identifies an audit. Audits are keyed by id in storage (`auditData_<id>`). */
export type AuditId = string;

/**
 * Identifies a requirement within an audit. Requirements have no separate id, so
 * they are identified by their title (matches `AuditRequirement.title`), assumed
 * unique within a single audit — consistent with how `addPlannedCourse` resolves
 * a requirement by title.
 */
export type RequirementId = string;

/**
 * What the last validation found for a requirement.
 * - "unchecked" – default; no validation has run on this requirement yet.
 * - "confirmed" – last validation found it satisfied by the current plan.
 * - "failed"    – last validation found it NOT satisfied.
 */
export type ValidationResult = "unchecked" | "confirmed" | "failed";

/**
 * The full per-requirement validation state — both dimensions in one record:
 * - result        – the last validation outcome.
 * - isStale       – true if the plan changed since `lastValidated`, so `result`
 *                   may be outdated. A SEPARATE flag, never folded into `result`.
 * - lastValidated – when `result` was produced, or null if never validated.
 */
export interface RequirementValidation {
  result: ValidationResult;
  isStale: boolean;
  lastValidated: Date | null;
}

/** The default state for a requirement that has never been validated. */
export function unvalidatedRequirement(): RequirementValidation {
  return { result: "unchecked", isStale: false, lastValidated: null };
}

/**
 * Validation state for one audit: a RequirementValidation per requirement, keyed
 * by requirement title.
 */
export type AuditValidationState = Record<RequirementId, RequirementValidation>;

/**
 * Validation state for a whole composite plan: per-audit, then per-requirement.
 * Mirrors 6.1's composite shape — CompositeAuditData holds one CachedAuditData
 * per member audit id, each with its own requirements — so this map slots onto
 * the composite with one AuditValidationState per audit id.
 */
export type CompositeValidationState = Record<AuditId, AuditValidationState>;

/**
 * A change to the plan that may invalidate prior validation results — a planned
 * course added to, removed from, or moved within a requirement. Each change names
 * the audit it happened in, so the requirements it makes stale address the
 * matching per-audit slot of CompositeValidationState. (move-course carries no
 * requirementTitle: a semester move marks nothing stale, so it needs none.)
 */
export type PlanChange =
  | { kind: "add-course"; auditId: AuditId; requirementTitle: RequirementId }
  | { kind: "remove-course"; auditId: AuditId; requirementTitle: RequirementId }
  | { kind: "move-course"; auditId: AuditId };

/**
 * Given a plan change, returns the requirement IDs (titles) within
 * `change.auditId` whose validation result should be marked stale — i.e. the
 * requirements to invalidate inside `CompositeValidationState[change.auditId]`.
 *
 * Intentionally conservative for v1 (see the ticket's staleness note): adding or
 * removing a planned course only invalidates the one requirement it applies to,
 * and moving a course between semesters does not change whether a requirement is
 * satisfied, so it marks nothing stale. Combination-sensitive cross-requirement
 * staleness is a future refinement, not a v1 blocker.
 */
export function requirementsMadeStaleBy(change: PlanChange): RequirementId[] {
  switch (change.kind) {
    case "add-course":
    case "remove-course":
      return [change.requirementTitle];
    case "move-course":
      return [];
  }
}

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
