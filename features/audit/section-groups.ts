import type { AuditRequirement, RequirementRule } from "@/domain/audit";
import type {
  CurrentAuditProgress,
  PlannableProgress,
} from "@/domain/progress";

export interface SectionWithProgress {
  title: string;
  rules: RequirementRule[];
  progress: PlannableProgress;
}

export interface GroupedSections {
  /** Standalone sections shown before the unified degree card (Core). */
  pre: SectionWithProgress[];
  /** Sections rolled up into the unified degree card (everything else). */
  unified: SectionWithProgress[];
  /** Standalone sections shown after the unified degree card (Credit). */
  post: SectionWithProgress[];
}

const isCore = (title: string) => title.toLowerCase().includes("core");
const isCredit = (title: string) => title.toLowerCase().includes("credit");
const isGpa = (title: string) => title.toLowerCase().includes("gpa");

/**
 * Single source of truth for how audit sections map to the dashboard's
 * pre / unified / post groups. `progresses.sections` is parallel to `sections`
 * by construction, so they zip by index. GPA and zero-total sections are dropped.
 */
export function groupAuditSections(
  sections: AuditRequirement[],
  progresses: CurrentAuditProgress,
): GroupedSections {
  const withProgress: SectionWithProgress[] = sections
    .map((section, index) => ({
      title: section.title,
      rules: section.rules,
      progress: progresses.sections[index]?.progress ?? {
        current: 0,
        planned: 0,
        total: 0,
      },
    }))
    .filter((section) => !isGpa(section.title) && section.progress.total > 0);

  return {
    pre: withProgress.filter((section) => isCore(section.title)),
    unified: withProgress.filter(
      (section) => !isCore(section.title) && !isCredit(section.title),
    ),
    post: withProgress.filter((section) => isCredit(section.title)),
  };
}
