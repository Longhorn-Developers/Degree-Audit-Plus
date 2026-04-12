import assert from "node:assert/strict";
import { calculateWeightedDegreeCompletion } from "../lib/audit-calculations";
import { parseRequirementProgress } from "../lib/backend/audit-scraper";
import type {
  AuditRequirement,
  Course,
  RequirementRule,
} from "../lib/general-types";

const parsedCases = [
  { input: "4 Hours", expected: { value: 4, unit: "hours" } },
  { input: "1 Hour", expected: { value: 1, unit: "hours" } },
  { input: "4 Courses", expected: { value: 4, unit: "courses" } },
  { input: "1 Course", expected: { value: 1, unit: "courses" } },
  { input: " 2 courses ", expected: { value: 2, unit: "courses" } },
];

for (const testCase of parsedCases) {
  assert.deepEqual(parseRequirementProgress(testCase.input), testCase.expected);
}

const hoursRule: RequirementRule = {
  text: "Hours-based requirement",
  requiredHours: 6,
  appliedHours: 3,
  remainingHours: 3,
  progressUnit: "hours",
  status: "In Progress",
  courses: ["planned-hours-course"],
};

const coursesRule: RequirementRule = {
  text: "Courses-based requirement",
  requiredHours: 4,
  appliedHours: 1,
  remainingHours: 3,
  progressUnit: "courses",
  status: "In Progress",
  courses: ["planned-course-1", "planned-course-2", "planned-course-3"],
};

const sections: AuditRequirement[] = [
  { title: "Major Requirements", rules: [hoursRule, coursesRule] },
];

const courses: Record<string, Course> = {
  "planned-hours-course": {
    id: "planned-hours-course",
    code: "CS 330",
    name: "Algorithms",
    hours: 3,
    semester: "Fall 2026",
    status: "Planned",
    type: "In-Residence",
  },
  "planned-course-1": {
    id: "planned-course-1",
    code: "M 341",
    name: "Linear Algebra",
    hours: 3,
    semester: "Fall 2026",
    status: "Planned",
    type: "In-Residence",
  },
  "planned-course-2": {
    id: "planned-course-2",
    code: "M 362K",
    name: "Probability",
    hours: 3,
    semester: "Spring 2027",
    status: "Planned",
    type: "In-Residence",
  },
  "planned-course-3": {
    id: "planned-course-3",
    code: "M 378K",
    name: "Discrete Math",
    hours: 3,
    semester: "Spring 2027",
    status: "Planned",
    type: "In-Residence",
  },
};

const results = calculateWeightedDegreeCompletion(sections, courses);

assert.equal(results.sections[0].progress.total, 10);
assert.equal(results.sections[0].progress.current, 4);
assert.equal(results.sections[0].progress.planned, 6);
assert.equal(results.total.planned, 6);

const cappedSections: AuditRequirement[] = [
  {
    title: "Cap Test",
    rules: [
      {
        ...coursesRule,
        remainingHours: 2,
      },
    ],
  },
];

const cappedResults = calculateWeightedDegreeCompletion(
  cappedSections,
  courses,
);
assert.equal(cappedResults.sections[0].progress.planned, 2);

console.log("Requirement progress validation passed.");
