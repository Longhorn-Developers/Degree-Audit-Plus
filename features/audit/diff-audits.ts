import type { AuditDiff, CachedAuditData, RuleChange } from "@/domain/audit";
import { calculateWeightedDegreeCompletion } from "./audit-calculations";

// What a new audit changed against an old one of the same degree: the overall
// percentage, and every rule whose applied hours moved.
export function diffAudits(
  before: CachedAuditData,
  after: CachedAuditData,
): AuditDiff {
  const old = new Map(ruleProgress(before).map((rule) => [keyOf(rule), rule]));
  const rules = ruleProgress(after).flatMap((now): RuleChange[] => {
    const was = old.get(keyOf(now));
    if (!was || was.applied === now.applied) return [];
    return [
      {
        requirement: now.requirement,
        rule: now.rule,
        unit: now.unit,
        required: now.required,
        appliedBefore: was.applied,
        appliedAfter: now.applied,
      },
    ];
  });
  return {
    progress: { before: percentOf(before), after: percentOf(after) },
    rules,
  };
}

// ------------------------------------------------------------------ helpers

type RuleProgress = Omit<RuleChange, "appliedBefore" | "appliedAfter"> & {
  applied: number;
};

// Course ids are re-minted on every scrape, so rules match by their text.
function keyOf(rule: RuleProgress): string {
  return `${rule.requirement}|${rule.rule}`;
}

// Every rule with its progress: applied hours plus planned courses, capped at
// what the rule still needs (same math as the completion donut).
function ruleProgress(audit: CachedAuditData): RuleProgress[] {
  return audit.requirements.flatMap((requirement) =>
    requirement.rules.map((rule) => {
      const planned = rule.courses
        .map((id) => audit.courses[id])
        .filter((course) => course?.status === "Planned")
        .reduce(
          (sum, course) =>
            sum + (rule.progressUnit === "courses" ? 1 : course.hours),
          0,
        );
      return {
        requirement: requirement.title,
        rule: rule.text,
        unit: rule.progressUnit,
        required: rule.requiredHours,
        applied:
          rule.appliedHours +
          Math.min(planned, Math.max(0, rule.remainingHours)),
      };
    }),
  );
}

// Completed plus planned over total, to one decimal.
function percentOf(audit: CachedAuditData): number {
  const { total } = calculateWeightedDegreeCompletion(
    audit.requirements,
    audit.courses,
  );
  if (total.total === 0) return 0;
  return (
    Math.round(((total.current + total.planned) / total.total) * 1000) / 10
  );
}
