import assert from "node:assert/strict";
import {
  getCompositeAuditRequirements,
  getDuplicateCourseRequirementFlags,
} from "../lib/audit-calculations";
import type { AuditHistoryData, CachedAuditData } from "../domain/audit";

// --- In-memory storage stub -------------------------------------------------
// `wxt/browser` resolves to globalThis.chrome at import time, which is undefined
// under Bun. Install a tiny in-memory chrome.storage.local before importing the
// storage module so the real CRUD functions can run end-to-end.
const store: Record<string, unknown> = {};
(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: store[key] }),
      set: async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      },
      remove: async (key: string) => {
        delete store[key];
      },
    },
  },
};

const {
  createComposite,
  getCachedComposites,
  updateCachedComposite,
  deleteCachedComposite,
  loadCompositeAudit,
} = await import("../lib/storage/composite-storage");

// --- Fixtures ---------------------------------------------------------------
// Two audits that share course code M 341 so the composite helpers have a
// duplicate to flag once the audits are combined.
function auditWith(ruleCourseId: string): CachedAuditData {
  return {
    requirements: [
      {
        title: "Requirements",
        rules: [
          {
            text: "Linear Algebra",
            requiredHours: 3,
            appliedHours: 3,
            remainingHours: 0,
            progressUnit: "hours",
            status: "Completed",
            courses: [ruleCourseId],
          },
        ],
      },
    ],
    courses: {
      [ruleCourseId]: {
        id: ruleCourseId,
        code: "M 341",
        name: "Linear Algebra",
        hours: 3,
        semester: "Fall 2026",
        status: "Completed",
        type: "In-Residence",
      },
    },
  };
}

const history: AuditHistoryData = {
  audits: [
    {
      auditId: "audit-cs",
      title: "Computer Science BS",
      majors: ["Computer Science"],
    },
    { auditId: "audit-math-minor", majors: ["Mathematics"] },
  ],
  timestamp: 0,
};

// Seed the per-audit cache + history the way the scraper/history flow would.
store["auditData_audit-cs"] = auditWith("cs-linear-algebra");
store["auditData_audit-math-minor"] = auditWith("minor-linear-algebra");
store["auditHistory"] = history;

// --- Tests ------------------------------------------------------------------

// create — stores the record and returns a freshly built composite.
const { saved, composite } = await createComposite("My Plan", [
  "audit-cs",
  "audit-math-minor",
]);

assert.ok(saved.id, "created composite has an id");
assert.equal(saved.name, "My Plan");
assert.deepEqual(saved.auditIds, ["audit-cs", "audit-math-minor"]);
assert.equal(composite.audits.length, 2);
assert.deepEqual(
  composite.audits.map((a) => a.name),
  ["Computer Science BS", "Mathematics"],
);

{
  const list = await getCachedComposites();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, saved.id);
}

// create a second — list grows, ids are distinct.
const second = await createComposite("CS only", ["audit-cs"]);
{
  const list = await getCachedComposites();
  assert.equal(list.length, 2);
  assert.notEqual(saved.id, second.saved.id);
}

// update — renames in place and keeps the id; missing id returns null.
{
  const updated = await updateCachedComposite(saved.id, { name: "Renamed" });
  assert.equal(updated?.name, "Renamed");
  assert.equal(updated?.id, saved.id);

  const list = await getCachedComposites();
  assert.equal(list.find((c) => c.id === saved.id)?.name, "Renamed");

  assert.equal(await updateCachedComposite("missing", { name: "x" }), null);
}

// reopen (build-on-demand) — rebuilds from the cache; missing member is skipped.
{
  await updateCachedComposite(saved.id, {
    auditIds: ["audit-cs", "missing-audit", "audit-math-minor"],
  });

  const built = await loadCompositeAudit(saved.id);
  assert.ok(built);
  assert.equal(built!.audits.length, 2); // missing-audit dropped, others load

  // The rebuilt composite is valid for the existing 6.1 helpers.
  const compositeRequirements = getCompositeAuditRequirements(built!);
  const duplicateFlags = getDuplicateCourseRequirementFlags(built!);
  assert.equal(compositeRequirements.length, 2);
  assert.deepEqual(compositeRequirements[0].duplicateCourseCodes, ["M 341"]);
  assert.equal(duplicateFlags.length, 1);
  assert.equal(duplicateFlags[0].courseCode, "M 341");

  assert.equal(await loadCompositeAudit("missing"), null);
}

// delete — removes the record; missing id returns false.
{
  assert.equal(await deleteCachedComposite(saved.id), true);
  const list = await getCachedComposites();
  assert.equal(list.length, 1);
  assert.equal(
    list.find((c) => c.id === saved.id),
    undefined,
  );

  assert.equal(await deleteCachedComposite("missing"), false);
}

console.log("Saved composites validation passed.");
