import assert from "node:assert/strict";
import {
  getCompositeAuditRequirements,
  getDuplicateCourseRequirementFlags,
} from "../lib/audit-calculations";
import { loadCompositeAuditData } from "../lib/storage/composite-storage";
import type { AuditHistoryData, CachedAuditData } from "../domain/audit";

// --- Fixtures ---------------------------------------------------------------

// Two audits that share a course code (M 341) so the composite helpers have a
// duplicate to flag once the audits are combined.
const csAudit: CachedAuditData = {
  requirements: [
    {
      title: "Major Requirements",
      rules: [
        {
          text: "Linear Algebra",
          requiredHours: 3,
          appliedHours: 3,
          remainingHours: 0,
          progressUnit: "hours",
          status: "Completed",
          courses: ["cs-linear-algebra"],
        },
      ],
    },
  ],
  courses: {
    "cs-linear-algebra": {
      id: "cs-linear-algebra",
      code: "M 341",
      name: "Linear Algebra",
      hours: 3,
      semester: "Fall 2026",
      status: "Completed",
      type: "In-Residence",
    },
  },
};

const mathMinorAudit: CachedAuditData = {
  requirements: [
    {
      title: "Minor Requirements",
      rules: [
        {
          text: "Linear Algebra",
          requiredHours: 3,
          appliedHours: 3,
          remainingHours: 0,
          progressUnit: "hours",
          status: "Completed",
          courses: ["minor-linear-algebra"],
        },
      ],
    },
  ],
  courses: {
    "minor-linear-algebra": {
      id: "minor-linear-algebra",
      code: "M 341",
      name: "Linear Algebra",
      hours: 3,
      semester: "Fall 2026",
      status: "Completed",
      type: "In-Residence",
    },
  },
};

const cache: Record<string, CachedAuditData> = {
  "audit-cs": csAudit,
  "audit-math-minor": mathMinorAudit,
};

const history: AuditHistoryData = {
  audits: [
    {
      auditId: "audit-cs",
      title: "Computer Science BS",
      majors: ["Computer Science"],
    },
    {
      auditId: "audit-math-minor",
      majors: ["Mathematics"],
      minors: ["Mathematics"],
    },
  ],
  timestamp: 0,
};

const mockGetData = (id: string) => Promise.resolve(cache[id] ?? null);
const mockGetHistory = () => Promise.resolve(history);

// --- Tests ------------------------------------------------------------------

// Combines multiple saved audits into the composite (AC #2).
{
  const composite = await loadCompositeAuditData(
    ["audit-cs", "audit-math-minor"],
    { getData: mockGetData, getHistory: mockGetHistory },
  );

  assert.equal(composite.audits.length, 2);
  // Name resolves from history title, then majors, then the raw id.
  assert.equal(composite.audits[0].name, "Computer Science BS");
  assert.equal(composite.audits[1].name, "Mathematics");
}

// Falls back to the raw id when history has no entry for the audit.
{
  const composite = await loadCompositeAuditData(["audit-cs"], {
    getData: mockGetData,
    getHistory: () => Promise.resolve(null),
  });

  assert.equal(composite.audits.length, 1);
  assert.equal(composite.audits[0].name, "audit-cs");
}

// Skips uncached IDs so the remaining audits still load (AC #3, #4).
{
  const composite = await loadCompositeAuditData(
    ["audit-cs", "missing-audit", "audit-math-minor"],
    { getData: mockGetData, getHistory: mockGetHistory },
  );

  assert.equal(composite.audits.length, 2);
  assert.deepEqual(
    composite.audits.map((a) => a.name),
    ["Computer Science BS", "Mathematics"],
  );
}

// The combined composite is consumed correctly by the 6.1 helpers.
{
  const composite = await loadCompositeAuditData(
    ["audit-cs", "audit-math-minor"],
    { getData: mockGetData, getHistory: mockGetHistory },
  );

  const compositeRequirements = getCompositeAuditRequirements(composite);
  const duplicateFlags = getDuplicateCourseRequirementFlags(composite);

  assert.equal(compositeRequirements.length, 2);
  assert.deepEqual(compositeRequirements[0].duplicateCourseCodes, ["M 341"]);
  assert.deepEqual(compositeRequirements[1].duplicateCourseCodes, ["M 341"]);

  assert.equal(duplicateFlags.length, 1);
  assert.equal(duplicateFlags[0].courseCode, "M 341");
  assert.deepEqual(duplicateFlags[0].auditNames, [
    "Computer Science BS",
    "Mathematics",
  ]);
}

console.log("Composite audit load validation passed.");
