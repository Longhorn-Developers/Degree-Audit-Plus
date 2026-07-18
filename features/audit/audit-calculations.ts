import type {
  AuditRequirement,
  CompositeAuditData,
  CompositeAuditRequirement,
  DuplicateCourseRequirementFlag,
} from "@/domain/audit";
import type { Course, CourseCode, CourseId } from "@/domain/course";
import type { CurrentAuditProgress } from "@/domain/progress";

// Section classification by title. These are core audit vocabulary: calculations
// and every UI surface classify sections the same way, so the string matching
// lives here as the single source of truth.
export const isCoreSection = (title: string): boolean =>
  title.toLowerCase().includes("core");
export const isCreditSection = (title: string): boolean =>
  title.toLowerCase().includes("credit");
export const isGpaSection = (title: string): boolean =>
  title.toLowerCase().includes("gpa");

export interface GpaSummary {
  hoursUsed: number;
  points: number;
}

/**
 * Extract the "X hours … Y points" figures from a GPA rule's sentence, if
 * present. Real scraped GPA text often does not carry these numbers (it states
 * the required average instead), in which case this returns null and the UI
 * omits the footer rather than fabricating zeros.
 */
export function parseGpaSummary(text: string | undefined): GpaSummary | null {
  if (!text) return null;

  const match = text.match(
    /(\d+(?:\.\d+)?)\s+hours.*?(\d+(?:\.\d+)?)\s+points/i,
  );
  if (!match) return null;

  return {
    hoursUsed: Number(match[1]),
    points: Number(match[2]),
  };
}

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
    (section) => !isGpaSection(section.title),
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
