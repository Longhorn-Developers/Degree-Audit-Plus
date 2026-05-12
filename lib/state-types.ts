import type {
  CollegeId,
  CourseId,
  DegreePlanId,
  IdaAuditId,
  MajorId,
  MinorCertId,
  Status,
} from "./general-types";

// ─── Enums / unions ──────────────────────────────────────────

export type CourseStatus = "planned" | "taking" | "taken";
export type InterestLevel = "low" | "medium" | "high";
export type RequirementStatus = "validated" | "hypothetical";
export type MinorCertKind = "minor" | "certificate";

export type Season = "fall" | "spring" | "summer";

export interface Semester {
  season: Season;
  year: number;
}

// ─── The shared Requirement shape ────────────────────────────
// Used inside Major, College.generalRequirements, MinorCert,
// and DegreePlan.basicCoreRequirements.

export type RequirementProgressUnit = "hours" | "courses";
export type RequirementRule = {
  text: string;
  progress: {
    current: number;
    planned: number;
    required: number;
  };
  progressUnit: RequirementProgressUnit;
  status: Status;
  courses: CourseId[];
};

export interface Requirement {
  title: string;
  rules: RequirementRule[];
}

// ─── Course ──────────────────────────────────────────────────

export interface Course {
  id: CourseId;
  name: string;
  description: string;
  credits: number;
  prerequisites: CourseId[];
  semester: Semester;
  status: CourseStatus;
}

// ─── College / Major / MinorCert ─────────────────────────────

export interface Major {
  id: MajorId;
  name: string;
  requirements: Requirement[];
}

export interface CollegeRequirement {
  id: CollegeId;
  name: string;
  majors: Major[];
  /** Requirements at the college level (not tied to any specific major). */
  generalRequirements: Requirement[];
}

export interface MinorCertRequirement {
  id: MinorCertId;
  kind: MinorCertKind;
  name: string;
  requirements: Requirement[];
}

// ─── DegreePlan ──────────────────────────────────────────────

export type Requirements = {
  colleges: CollegeRequirement[];
  minorsCerts: MinorCertRequirement[];
  basicCoreRequirements: Requirement[];
};

export interface DegreePlan {
  id: DegreePlanId;
  /** Display name chosen by the user (e.g., "CS + Math double major"). */
  name: string;
  interestLevel: InterestLevel;
  /** IDA audits that have been run against this plan. */
  idaAuditIds: IdaAuditId[];
  lastValidated: Date;
  allCourses: Course[];
  requirements: Requirements;
}

// ─── Root app state ──────────────────────────────────────────

export interface AppState {
  degreePlans: DegreePlan[];
  /** Points to one entry in `degreePlans`. Null if no plan is primary
   *  (e.g., right after the primary plan was deleted). */
  primaryDegreePlanId: DegreePlanId | null;
}
