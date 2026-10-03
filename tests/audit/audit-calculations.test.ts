import { expect, test } from "bun:test";
import type { CachedAuditData, RequirementRule } from "../../domain/audit";
import type { Course, CourseId } from "../../domain/course";
import { diffAudits } from "../../features/audit/audit-calculations";

function rule(text: string, applied: number, courses: string[] = []) {
  return {
    text,
    requiredHours: 6,
    appliedHours: applied,
    remainingHours: 6 - applied,
    progressUnit: "hours",
    status: "In Progress",
    courses: courses as CourseId[],
  } as unknown as RequirementRule;
}

function audit(
  history: RequirementRule,
  courses: Record<string, Partial<Course>> = {},
): CachedAuditData {
  return {
    requirements: [{ title: "CORE", rules: [history, rule("Government", 3)] }],
    courses: courses as Record<CourseId, Course>,
  };
}

test("reports only the rules that moved, and the new percentage", () => {
  const diff = diffAudits(
    audit(rule("U.S. History", 0)),
    audit(rule("U.S. History", 3)),
  );

  expect(diff.rules).toEqual([
    {
      requirement: "CORE",
      rule: "U.S. History",
      unit: "hours",
      required: 6,
      appliedBefore: 0,
      appliedAfter: 3,
    },
  ]);
  expect(diff.progress).toEqual({ before: 25, after: 50 });
});

test("counts a planned course UT attached but did not apply", () => {
  const diff = diffAudits(
    audit(rule("U.S. History", 0)),
    audit(rule("U.S. History", 0, ["c1"]), {
      c1: { status: "Planned", hours: 3 },
    }),
  );

  expect(diff.rules[0]).toMatchObject({ appliedBefore: 0, appliedAfter: 3 });
  expect(diff.progress).toEqual({ before: 25, after: 50 });
});

test("an audit that changed nothing has no rule changes", () => {
  const same = audit(rule("U.S. History", 3));
  expect(diffAudits(same, same).rules).toEqual([]);
});
