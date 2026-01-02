export type Progress = {
  current: number;
  total: number;
};

// Scraper types - source of truth from audit page parsing
export type CourseStatus = "Applied" | "Planned" | "In Progress" | "Unknown";

export type CourseRowData = {
  code: string;
  name: string;
  uniqueNumber?: string;
  semester: string;
  grade?: string;
  hours?: number;
  status: CourseStatus;
};

export type RequirementRule = {
  text: string;
  requiredHours: number;
  appliedHours: number;
  remainingHours: number;
  status: "fulfilled" | "partial" | "unfulfilled";
  courses: CourseRowData[];
};

export type RequirementSection = {
  rules: RequirementRule[];
};

export type Course = {
  code: string;
  name: string;
  hours: number;
  credits: number;
  semester: string;
  grade: string;
  status: "Completed" | "In Progress" | "Not Started";
};

export type RequirementBreakdownProps = {
  title: string;
  hours: Progress;
  credits: Progress;
  courses: Course[];
  onAddCourse?: () => void;
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
}

export interface AuditHistoryData {
  audits: DegreeAuditCardProps[];
  timestamp: number;
  error?: string;
  auditNumber?: number;
  // Track which audits have been scraped and cached
  scrapedAuditIds?: string[];
}

export interface AuditData {
  // holds complete information for an audit.
  auditNumber: number;
  completion: number;
  requirements: RequirementSection[];
  courses: CourseRowData[];
}

export type RequirementBreakdownComponentProps = {
  title: string;
  hours: { current: number; total: number };
  requirements: RequirementRule[];
  onAddCourse?: () => void;
};
