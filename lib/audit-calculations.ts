import type {
  AuditRequirement,
  Course,
  CourseId,
  CurrentAuditProgress,
} from "./general-types";

export function calculateWeightedDegreeCompletion(
  sections: AuditRequirement[],
  courses: Record<CourseId, Course>,
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
    sectionProgress.progress.total = section.rules.reduce(
      (acc, rule) => acc + rule.requiredHours,
      0,
    );

    section.rules.forEach((rule) => {
      sectionProgress.progress.current += rule.appliedHours;
      let plannedContribution = 0;

      rule.courses.forEach((courseId) => {
        const course = courses[courseId];
        if (!course || course.status !== "Planned") {
          return;
        }

        if (rule.progressUnit === "courses") {
          plannedContribution += 1;
        } else {
          plannedContribution += course.hours;
        }
      });

      const remainingForRule = Math.max(0, rule.remainingHours);
      const cappedPlannedContribution = Math.min(
        plannedContribution,
        remainingForRule,
      );

      results.total.planned += cappedPlannedContribution;
      sectionProgress.progress.planned += cappedPlannedContribution;
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
  console.log("[Audit Calculations] results", results);
  return results;
}
