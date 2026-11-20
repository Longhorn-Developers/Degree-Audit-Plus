// Contains small helper functions and types for the audit feature.
import type {
  Course,
  CourseCode,
  CourseId,
  PlannerRowKey,
  PlannerSyncTarget,
  Status,
} from "./course";
import type { RequirementProgressUnit } from "./progress";

export interface RequirementRule {
  text: string;
  requiredHours: number;
  appliedHours: number;
  remainingHours: number;
  progressUnit: RequirementProgressUnit;
  status: Status;
  courses: CourseId[];
  summary?: string;
}

export interface AuditRequirement {
  title: string;
  rules: RequirementRule[];
}

// One rule whose progress moved between two audits.
export interface RuleChange {
  requirement: string;
  rule: string;
  unit: RequirementProgressUnit;
  required: number;
  appliedBefore: number;
  appliedAfter: number;
}

// What a preview audit changed against the main one. Percentages are 0-100.
export interface AuditDiff {
  progress: { before: number; after: number };
  rules: RuleChange[];
}

// The last preview: the course it put on UT's planner and the audit it ran.
// `row` is null when the course was already planned, so dropping the preview
// leaves it alone. `auditId` is null until UT has the audit. The audit stays
// on UT, hidden from the app, until it's added to the plan or dropped.
export interface PendingPreview {
  course: PlannerSyncTarget;
  row: PlannerRowKey | null;
  auditId: string | null;
}

export interface AcceptedCourse {
  course: PlannerSyncTarget;
  row: PlannerRowKey | null;
  acceptedAt: number;
}

export interface CachedAuditData {
  name?: string;
  requirements: AuditRequirement[];
  courses: Record<CourseId, Course>;
}

export interface CompositeAuditData {
  audits: CachedAuditData[];
}

export interface CachedCompositeAudit {
  id: string;
  name: string;
  auditIds: string[];
}

export interface CompositeAuditRequirement extends AuditRequirement {
  auditName: string;
  duplicateCourseCodes: CourseCode[];
}

export interface DuplicateCourseRequirementFlag {
  courseCode: CourseCode;
  auditNames: string[];
}

// What UT needs to run an audit's degree again, read off its Rerun link.
export interface AuditDegree {
  degreePlan: string;
  catalogYear: string;
}

export interface AuditHistoryEntry {
  title?: string;
  majors?: string[];
  minors?: string[];
  percentage?: number;
  auditId?: string;
  pinned?: boolean;
  // missing when the app can't rerun it, see parseRerunDegree
  degree?: AuditDegree;
}

export interface AuditHistoryData {
  audits: AuditHistoryEntry[];
  timestamp: number;
  error?: string;
}

// UT form values are submitted verbatim; degree-plan codes include trailing spaces.
export interface CustomAuditRunRequest {
  catalog: string;
  college: string;
  degreePlan: string;
  minor?: string;
  certificate?: string;
  includeCurrent?: boolean;
  includeFuture?: boolean;
  includePlanned?: boolean;
}

export function getAuditDisplayName(
  entry: AuditHistoryEntry | undefined,
): string | null {
  return entry?.title ?? entry?.majors?.join("; ") ?? null;
}

export function hasAuditResult(
  entry: AuditHistoryEntry,
): entry is AuditHistoryEntry & { auditId: string } {
  return Boolean(entry.auditId);
}
