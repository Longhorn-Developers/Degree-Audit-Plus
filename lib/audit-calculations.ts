import type {
  AuditRequirement,
  CompositeAuditData,
  CompositeAuditRequirement,
  Course,
  CourseCode,
  CourseId,
  CurrentAuditProgress,
  DuplicateCourseRequirementFlag,
} from "./general-types";

// Give unnamed audits a readable fallback so the UI never shows a blank source.
function getAuditName(
  audit: CompositeAuditData["audits"][number],
  index: number,
) {
  return audit.name ?? `Degree Audit ${index + 1}`;
}

// Find course codes that appear in requirements from more than one audit.
export function getDuplicateCourseRequirementFlags(
  composite: CompositeAuditData,
): DuplicateCourseRequirementFlag[] {
  const courseAudits = new Map<CourseCode, Set<string>>();

  composite.audits.forEach((audit, auditIndex) => {
    const auditName = getAuditName(audit, auditIndex);

    audit.requirements.forEach((requirement) => {
      requirement.rules.forEach((rule) => {
        rule.courses.forEach((courseId) => {
          const course = audit.courses[courseId];
          if (!course) return;

          const auditNames = courseAudits.get(course.code) ?? new Set<string>();
          auditNames.add(auditName);
          courseAudits.set(course.code, auditNames);
        });
      });
    });
  });

  return Array.from(courseAudits.entries())
    .filter(([, auditNames]) => auditNames.size > 1)
    .map(([courseCode, auditNames]) => ({
      courseCode,
      auditNames: Array.from(auditNames),
    }));
}

// Build the composite requirement list used by views that need all audits together.
export function getCompositeAuditRequirements(
  composite: CompositeAuditData,
): CompositeAuditRequirement[] {
  const duplicateCodes = new Set(
    getDuplicateCourseRequirementFlags(composite).map(
      (flag) => flag.courseCode,
    ),
  );

  return composite.audits.flatMap((audit, auditIndex) => {
    const auditName = getAuditName(audit, auditIndex);

    return audit.requirements.map((requirement) => ({
      ...requirement,
      auditName,
      duplicateCourseCodes: Array.from(
        new Set(
          requirement.rules.flatMap((rule) =>
            rule.courses
              .map((courseId) => audit.courses[courseId]?.code)
              .filter(
                (code): code is CourseCode =>
                  !!code && duplicateCodes.has(code),
              ),
          ),
        ),
      ),
    }));
  });
}

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
