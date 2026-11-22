import type { CoreArea } from "@/domain/course";

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
