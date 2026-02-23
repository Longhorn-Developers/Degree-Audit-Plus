import type {
  PlanableProgress,
  Progress,
  RequirementSection,
} from "./general-types";

export type CurrentAuditProgress = {
  total: Progress;
  sections: {
    title: string;
    progress: PlanableProgress;
  }[];
};

export function calculateWeightedDegreeCompletion(
  sections: RequirementSection[],
): CurrentAuditProgress {
  const results: CurrentAuditProgress = {
    total: { current: 0, total: 0 },
    sections: [],
  };
  sections.forEach((section) => {
    const sectionProgress = {
      title: section.title,
      progress: { current: 0, planned: 0, total: 0 },
    };
    sectionProgress.progress.total = section.rules.reduce(
      (acc, rule) => acc + rule.requiredHours,
      0,
    );

    section.rules.forEach((rule) => {
      // Use pre-calculated appliedHours for current progress (reliable)
      sectionProgress.progress.current += rule.appliedHours;

      // Calculate planned hours from individual courses (for planner feature)
      rule.courses.forEach((course) => {
        if (course.status === "Planned") {
          sectionProgress.progress.planned += course.hours ?? 0;
        }
      });
    });

    results.sections.push(sectionProgress);
  });
  // Only include non-GPA sections in completion totals
  const nonGPASections = results.sections.filter(
    (section) => !section.title.toLowerCase().includes("gpa"),
  );
  results.total.current = nonGPASections.reduce(
    (acc, section) => acc + section.progress.current,
    0,
  );
  results.total.total = nonGPASections.reduce(
    (acc, section) => acc + section.progress.total,
    0,
  );
  return results;
}
