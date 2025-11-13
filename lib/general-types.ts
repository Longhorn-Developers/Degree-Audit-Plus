export type Progress = {
  current: number;
  total: number;
};

// export type DoneAndWorkingAndUnmetRequirementsProgress = {
//   done: number;
//   working: number;
//   unmet: number;
// };

// export type RequirementBreakdownProps = {
//   title: string;
//   hours: Progress;
//   credits: Progress;
//   courses: Course[];
// };

export type Course = {
  code: string;
  name: string;
  hours: number;
  credits: number;
  semester: string;
  grade: string;
  status: "Completed" | "In Progress" | "Not Started";
};

export interface DegreeAuditCardProps {
  title?: string;
  majors?: string[];
  minors?: string[];
  percentage?: number;
}

export interface AuditHistoryData {
  audits: DegreeAuditCardProps[];
  timestamp: number;
  error?: string;
}

export interface AuditData {
  // holds complete information for an audit.
}
