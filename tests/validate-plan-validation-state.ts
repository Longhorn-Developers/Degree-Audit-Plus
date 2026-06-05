import assert from "node:assert/strict";
import {
  requirementsMadeStaleBy,
  unvalidatedRequirement,
} from "../lib/general-types";
import type {
  AuditValidationState,
  CompositeValidationState,
  PlanChange,
  RequirementValidation,
} from "../lib/general-types";

// Default state: a requirement starts unchecked, fresh, and never validated.
assert.deepEqual(unvalidatedRequirement(), {
  result: "unchecked",
  isStale: false,
  lastValidated: null,
});

// Each call returns a fresh object, so callers never share a mutable default.
assert.notEqual(unvalidatedRequirement(), unvalidatedRequirement());

// Adding or removing a planned course marks only its own requirement stale.
assert.deepEqual(
  requirementsMadeStaleBy({
    kind: "add-course",
    auditId: "audit-123",
    requirementTitle: "Core Curriculum",
  }),
  ["Core Curriculum"],
);
assert.deepEqual(
  requirementsMadeStaleBy({
    kind: "remove-course",
    auditId: "audit-123",
    requirementTitle: "Major Requirements",
  }),
  ["Major Requirements"],
);

// Moving a course between semesters changes no requirement's satisfaction, so
// nothing goes stale (matches the ticket's transitions table).
assert.deepEqual(
  requirementsMadeStaleBy({ kind: "move-course", auditId: "audit-123" }),
  [],
);

// Result and staleness are independent dimensions: "confirmed + stale" must be
// representable and distinct from "failed + stale".
const confirmedButStale: RequirementValidation = {
  result: "confirmed",
  isStale: true,
  lastValidated: new Date("2026-01-01"),
};
const failedAndStale: RequirementValidation = {
  result: "failed",
  isStale: true,
  lastValidated: new Date("2026-01-01"),
};
assert.notEqual(confirmedButStale.result, failedAndStale.result);
assert.equal(confirmedButStale.isStale, failedAndStale.isStale);

// "Validate" transition: the result updates and staleness resets to fresh.
const afterValidate: RequirementValidation = {
  ...confirmedButStale,
  isStale: false,
  lastValidated: new Date(),
};
assert.equal(afterValidate.isStale, false);
assert.notEqual(afterValidate.lastValidated, null);

// State model is per-audit, then per-requirement (mirrors 6.1's composite shape).
const auditState: AuditValidationState = {
  "Core Curriculum": unvalidatedRequirement(),
};
const composite: CompositeValidationState = {
  "audit-123": auditState,
};
assert.equal(composite["audit-123"]["Core Curriculum"].result, "unchecked");

// A plan change addresses the matching per-audit slot: apply the helper's
// requirement IDs under change.auditId.
const change: PlanChange = {
  kind: "add-course",
  auditId: "audit-123",
  requirementTitle: "Core Curriculum",
};
for (const reqId of requirementsMadeStaleBy(change)) {
  composite[change.auditId][reqId] = {
    ...composite[change.auditId][reqId],
    isStale: true,
  };
}
assert.equal(composite["audit-123"]["Core Curriculum"].isStale, true);

console.log("plan-validation-state: all assertions passed");
