import type { CachedAuditData } from "@/domain/audit";
import type {
  CourseId,
  PlannedCourseOutline,
  StringSemester,
} from "@/domain/course";

export function addPlannedCourse(
  audit: CachedAuditData,
  course: PlannedCourseOutline,
  requirementTitle: string,
  ruleTitle: string,
  createId: () => string = () => crypto.randomUUID(),
): { audit: CachedAuditData; courseId: CourseId } | null {
  const requirementIndex = audit.requirements.findIndex(
    ({ title }) => title === requirementTitle,
  );
  const ruleIndex = audit.requirements[requirementIndex]?.rules.findIndex(
    ({ text }) => text === ruleTitle,
  );
  if (requirementIndex < 0 || ruleIndex === undefined || ruleIndex < 0) {
    return null;
  }

  const courseId = createId();
  const requirements = audit.requirements.map((requirement, index) =>
    index !== requirementIndex
      ? requirement
      : {
          ...requirement,
          rules: requirement.rules.map((rule, currentRuleIndex) =>
            currentRuleIndex !== ruleIndex
              ? rule
              : { ...rule, courses: [...rule.courses, courseId] },
          ),
        },
  );

  return {
    courseId,
    audit: {
      ...audit,
      requirements,
      courses: { ...audit.courses, [courseId]: { ...course, id: courseId } },
    },
  };
}

export function removePlannedCourse(
  audit: CachedAuditData,
  courseId: CourseId,
): CachedAuditData | null {
  if (audit.courses[courseId]?.status !== "Planned") return null;

  const courses = { ...audit.courses };
  delete courses[courseId];
  return {
    ...audit,
    courses,
    requirements: audit.requirements.map((requirement) => ({
      ...requirement,
      rules: requirement.rules.map((rule) => ({
        ...rule,
        courses: rule.courses.filter((id) => id !== courseId),
      })),
    })),
  };
}

export function wipePlannedCourses(audit: CachedAuditData): {
  audit: CachedAuditData;
  removed: number;
} {
  const plannedIds = new Set(
    Object.values(audit.courses)
      .filter(({ status }) => status === "Planned")
      .map(({ id }) => id),
  );
  if (!plannedIds.size) return { audit, removed: 0 };

  return {
    removed: plannedIds.size,
    audit: {
      ...audit,
      courses: Object.fromEntries(
        Object.entries(audit.courses).filter(([id]) => !plannedIds.has(id)),
      ),
      requirements: audit.requirements.map((requirement) => ({
        ...requirement,
        rules: requirement.rules.map((rule) => ({
          ...rule,
          courses: rule.courses.filter((id) => !plannedIds.has(id)),
        })),
      })),
    },
  };
}

export function moveCourseToSemester(
  audit: CachedAuditData,
  courseId: CourseId,
  semester: StringSemester,
): CachedAuditData | null {
  const course = audit.courses[courseId];
  if (!course) return null;

  return {
    ...audit,
    courses: {
      ...audit.courses,
      [courseId]: { ...course, semester },
    },
  };
}
