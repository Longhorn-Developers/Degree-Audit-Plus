import { describe, expect, test } from "bun:test";
import type { CachedAuditData } from "../../domain/audit";
import {
  addPlannedCourse,
  moveCourseToSemester,
  removePlannedCourse,
  wipePlannedCourses,
} from "../../features/degree-audit-app/providers/audit-mutations";

function createAudit(): CachedAuditData {
  return {
    requirements: [
      {
        title: "Core Curriculum",
        rules: [
          {
            text: "CORE (020): Mathematics",
            requiredHours: 3,
            appliedHours: 0,
            remainingHours: 3,
            progressUnit: "hours",
            status: "Not Started",
            courses: [],
          },
        ],
      },
    ],
    courses: {},
  };
}

const plannedCourse = {
  code: "M 408C" as const,
  name: "Differential and Integral Calculus",
  hours: 4,
  semester: "Fall 2026" as const,
  status: "Planned" as const,
  type: "In-Residence" as const,
};

describe("audit mutations", () => {
  test("adds a planned course without mutating the source audit", () => {
    const source = createAudit();
    const result = addPlannedCourse(
      source,
      plannedCourse,
      "Core Curriculum",
      "CORE (020): Mathematics",
      () => "planned-1",
    );

    expect(result?.courseId).toBe("planned-1");
    expect(result?.audit.courses["planned-1"]).toEqual({
      ...plannedCourse,
      id: "planned-1",
    });
    expect(result?.audit.requirements[0].rules[0].courses).toEqual([
      "planned-1",
    ]);
    expect(source).toEqual(createAudit());
  });

  test("moves a course to a new semester", () => {
    const added = addPlannedCourse(
      createAudit(),
      plannedCourse,
      "Core Curriculum",
      "CORE (020): Mathematics",
      () => "planned-1",
    )!;

    const moved = moveCourseToSemester(added.audit, "planned-1", "Spring 2027");

    expect(moved?.courses["planned-1"].semester).toBe("Spring 2027");
    expect(added.audit.courses["planned-1"].semester).toBe("Fall 2026");
  });

  test("removes one planned course from courses and requirement references", () => {
    const added = addPlannedCourse(
      createAudit(),
      plannedCourse,
      "Core Curriculum",
      "CORE (020): Mathematics",
      () => "planned-1",
    )!;

    const removed = removePlannedCourse(added.audit, "planned-1");

    expect(removed?.courses).toEqual({});
    expect(removed?.requirements[0].rules[0].courses).toEqual([]);
  });

  test("wipes every planned course while preserving completed courses", () => {
    const audit = createAudit();
    audit.courses = {
      planned: { ...plannedCourse, id: "planned" },
      completed: {
        ...plannedCourse,
        id: "completed",
        status: "Completed",
      },
    };
    audit.requirements[0].rules[0].courses = ["planned", "completed"];

    const result = wipePlannedCourses(audit);

    expect(result.removed).toBe(1);
    expect(Object.keys(result.audit.courses)).toEqual(["completed"]);
    expect(result.audit.requirements[0].rules[0].courses).toEqual([
      "completed",
    ]);
  });
});
