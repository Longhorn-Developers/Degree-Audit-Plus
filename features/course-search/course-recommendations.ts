import type { AuditRequirement } from "@/domain/audit";
import type { CatalogCourse } from "@/domain/catalog";
import type { CoreArea } from "@/domain/course";
import { findCoursesByCore, searchCores } from "@/features/catalog/catalog-db";

const CORE_CODE_TO_NAME: Partial<Record<string, CoreArea>> = {
  "090": "First-Year Signature Course",
  "010": "Communication",
  "040": "Humanities",
  "070": "American and Texas Government",
  "060": "U.S. History",
  "080": "Social and Behavioral Sciences",
  "020": "Mathematics",
  "030": "Natural Science and Technology, Part I",
  "093": "Natural Science and Technology, Part II",
  "050": "Visual and Performing Arts",
};

export function getCoreAreaFromRequirementRule(
  requirementTitle: string,
  ruleText: string,
): CoreArea | null {
  if (requirementTitle !== "Core Curriculum") return null;

  const coreCode = ruleText.match(/CORE \((\d{3})\)/)?.[1];
  return coreCode ? (CORE_CODE_TO_NAME[coreCode] ?? null) : null;
}

export function getMissingCoreRequirements(
  sections: AuditRequirement[],
): Partial<Record<CoreArea, number>> {
  const coreSection = sections.find(
    (section) => section.title === "Core Curriculum",
  );
  if (!coreSection) return {};

  return coreSection.rules.reduce<Partial<Record<CoreArea, number>>>(
    (missing, rule) => {
      const coreArea = getCoreAreaFromRequirementRule(
        coreSection.title,
        rule.text,
      );

      if (coreArea && rule.remainingHours > 0) {
        missing[coreArea] = rule.remainingHours;
      }

      return missing;
    },
    {},
  );
}

export async function getSuggestedCoreCourses(
  sections: AuditRequirement[],
  maxSuggestions = 3,
): Promise<CatalogCourse[]> {
  const suggestionCount = Math.max(0, Math.floor(maxSuggestions));
  const missingCoreEntries = Object.entries(
    getMissingCoreRequirements(sections),
  )
    .filter((entry): entry is [CoreArea, number] => entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);

  if (suggestionCount === 0 || missingCoreEntries.length === 0) return [];

  const courseBuckets = await Promise.all(
    missingCoreEntries.map(([core]) => searchCores(suggestionCount, core)),
  );
  const suggestions: CatalogCourse[] = [];
  const seenCourseIds = new Set<number>();

  while (
    suggestions.length < suggestionCount &&
    courseBuckets.some((bucket) => bucket.length > 0)
  ) {
    for (const bucket of courseBuckets) {
      while (bucket.length > 0 && seenCourseIds.has(bucket[0].uniqueId)) {
        bucket.shift();
      }
      if (bucket.length === 0) continue;

      const nextCourse = bucket.shift()!;
      suggestions.push(nextCourse);
      seenCourseIds.add(nextCourse.uniqueId);

      if (suggestions.length === suggestionCount) break;
    }
  }

  return suggestions;
}

export function getSuggestedCoursesForRequirement(
  requirementTitle: string,
  ruleTitle: string,
  maxSuggestions = Number.POSITIVE_INFINITY,
): Promise<CatalogCourse[]> {
  const coreArea = getCoreAreaFromRequirementRule(requirementTitle, ruleTitle);
  if (!coreArea) return Promise.resolve([]);

  return Number.isFinite(maxSuggestions)
    ? searchCores(maxSuggestions, coreArea)
    : findCoursesByCore(coreArea);
}
