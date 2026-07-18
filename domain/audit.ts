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
}

export interface AuditRequirement {
  title: string;
  rules: RequirementRule[];
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

/**
 * The display name for an audit history entry, title-first: the audit's own
 * title, else its majors joined, else null. Callers supply their own final
 * fallback (an id, "Degree Requirements", etc.).
 */
export function getAuditDisplayName(
  entry: AuditHistoryEntry | undefined,
): string | null {
  return entry?.title ?? entry?.majors?.join("; ") ?? null;
}
