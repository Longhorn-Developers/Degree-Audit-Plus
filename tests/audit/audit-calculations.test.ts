import { expect, test } from "bun:test";
import type { CachedAuditData, RequirementRule } from "../../domain/audit";
import type { Course, CourseCode, CourseId } from "../../domain/course";
import {
  diffAudits,
  findMissingPlannedCourses,
  hasPlannedCourse,
} from "../../features/audit/audit-calculations";

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

test("reports only the rules that moved", () => {
  const rules = diffAudits(
    audit(rule("U.S. History", 0)),
    audit(rule("U.S. History", 3)),
  );

  expect(rules).toEqual([
    {
      requirement: "CORE",
      rule: "U.S. History",
      unit: "hours",
      required: 6,
      appliedBefore: 0,
      appliedAfter: 3,
    },
  ]);
});

test("counts planned courses on top of applied hours", () => {
  const rules = diffAudits(
    audit(rule("U.S. History", 0)),
    audit(rule("U.S. History", 0, ["c1"]), {
      c1: { status: "Planned", hours: 3 },
    }),
  );

  expect(rules[0]).toMatchObject({ appliedBefore: 0, appliedAfter: 3 });
});

test("an audit that changed nothing has no rule changes", () => {
  const same = audit(rule("U.S. History", 3));
  expect(diffAudits(same, same)).toEqual([]);
});

test("a rule only the new audit has counts up from 0", () => {
  const before = audit(rule("U.S. History", 0));
  const after = audit(rule("U.S. History", 0));
  after.requirements.push({ title: "Minor", rules: [rule("Electives", 3)] });

  expect(diffAudits(before, after)).toEqual([
    {
      requirement: "Minor",
      rule: "Electives",
      unit: "hours",
      required: 6,
      appliedBefore: 0,
      appliedAfter: 3,
    },
  ]);
});

test("finds planned courses the old audit doesn't have, except the previewed one", () => {
  const before = audit(rule("U.S. History", 0, ["c1"]), {
    c1: { code: "HIS 315K", status: "Planned", hours: 3 },
  });
  const after = audit(rule("U.S. History", 0, ["c1", "c2", "c3"]), {
    c1: { code: "HIS 315K", status: "Planned", hours: 3 },
    c2: { code: "C S 312" as CourseCode, status: "Planned", hours: 3 },
    c3: { code: "BSN 302", status: "Planned", hours: 3 },
  });

  expect(findMissingPlannedCourses(before, after, "BSN  302")).toEqual([
    "C S 312" as CourseCode,
  ]);
});

test("swapping the audits finds planned courses the planner no longer has", () => {
  const stale = audit(rule("U.S. History", 0, ["c1"]), {
    c1: { code: "ADV 305", status: "Planned", hours: 3 },
  });
  const preview = audit(rule("U.S. History", 0, ["c2"]), {
    c2: { code: "BSN 302", status: "Planned", hours: 3 },
  });

  expect(findMissingPlannedCourses(preview, stale, "BSN 302")).toEqual([
    "ADV 305",
  ]);
});

test("only planned courses in the audit count as planned", () => {
  const main = audit(rule("U.S. History", 3, ["c1", "c2"]), {
    c1: { code: "C S 331" as CourseCode, status: "Planned", hours: 3 },
    c2: { code: "HIS 315K" as CourseCode, status: "Completed", hours: 3 },
  });

  expect(hasPlannedCourse(main, ["C S  331"])).toBe(true);
  expect(hasPlannedCourse(main, ["HIS 315K"])).toBe(false);
  expect(hasPlannedCourse(main, ["ADV 305"])).toBe(false);
});
