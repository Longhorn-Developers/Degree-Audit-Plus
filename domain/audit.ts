// Contains small helper functions and types for the audit feature.
import type { Course, CourseCode, CourseId, Status } from "./course";
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

// The one preview kept in storage at a time.
export interface PreviewAudit {
  auditId: string;
  audit: CachedAuditData;
  diff: AuditDiff;
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

export interface AuditHistoryEntry {
  title?: string;
  majors?: string[];
  minors?: string[];
  percentage?: number;
  auditId?: string;
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
