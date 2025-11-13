export type Progress = {
  current: number;
  total: number;
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
