export interface Progress {
  current: number;
  total: number;
}

export interface PlannableProgress extends Progress {
  planned: number;
}

export interface CurrentAuditProgress {
  total: PlannableProgress;
  sections: Array<{
    title: string;
    progress: PlannableProgress;
  }>;
}

export type RequirementProgressUnit = "hours" | "courses";
