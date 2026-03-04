import type { AuditRequirement, CurrentAuditProgress } from "./general-types";

export function calculateWeightedDegreeCompletion(
  sections: AuditRequirement[],
): CurrentAuditProgress {
  const results: CurrentAuditProgress = {
    total: { current: 0, planned: 0, total: 0 },
    sections: [],
  };
  console.log("sections", sections);
  sections.forEach((section) => {
    const sectionProgress = {
      title: section.title,
      progress: { current: 0, planned: 0, total: 0 },
    };
    sectionProgress.progress.total = section.rule.reduce(
      (acc, rule) => acc + rule.requiredHours,
      0,
    );

    section.rule.forEach((rule) => {
      sectionProgress.progress.current += rule.appliedHours;
    });

    results.sections.push(sectionProgress);
  });
  results.total.current = results.sections.reduce(
    (acc, section) => acc + section.progress.current,
    0,
  );
  results.total.total = results.sections.reduce(
    (acc, section) => acc + section.progress.total,
    0,
  );
  return results;
}
