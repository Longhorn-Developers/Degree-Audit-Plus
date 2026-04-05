import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { searchCores } from "@/lib/backend/db";
import { AuditRequirement, CatalogCourse, CoreArea } from "@/lib/general-types";
import { useEffect } from "react";
import { useAuditContext } from "../providers/audit-provider";
import { useCourseModalContext } from "../providers/course-modal-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import { CreditHourTotalsCard, GPATotalsCard } from "./gpa-credit-cards";
import RequirementBreakdown, { UnifiedDegreeCard } from "./requirement-breakdown";

function parseGpaSummary(text: string | undefined) {
  if (!text) {
    return null;
  }

  const match = text.match(
    /(\d+(?:\.\d+)?)\s+hours.*?(\d+(?:\.\d+)?)\s+points/i,
  );
  if (!match) {
    return null;
  }

  return {
    hoursUsed: Number(match[1]),
    points: Number(match[2]),
  };
}

// gets remaining core requreiemtsn needed with core area as key and hours needed as value
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

// TODO function to get potential classes
// need to make sure we handle compexities of the rules (like "2 of the following 3 classes") and also the fact that some classes can satisfy multiple requirements (like a class that satisfies both a core requirement and a major requirement)

function getMissingCoreRequirements(
  sections: AuditRequirement[],
): Partial<Record<CoreArea, number>> {
  const coreSection = sections.find(
    (section) => section.title === "Core Curriculum",
  );
  if (!coreSection) {
    return {};
  }

  return coreSection.rules.reduce<Partial<Record<CoreArea, number>>>(
    (missing, rule) => {
      const coreCode = rule.text.match(/CORE \((\d{3})\)/)?.[1];
      const coreName = coreCode ? CORE_CODE_TO_NAME[coreCode] : undefined;

      if (coreName && rule.remainingHours > 0) {
        missing[coreName] = rule.remainingHours;
      }

      return missing;
    },
    {},
  );
}


// gets a few core classes to suggest, tries to do one from each missing core first
async function getSuggestedCoreCourses(
  sections: AuditRequirement[],
  maxSuggestions = 3,
): Promise<CatalogCourse[]> {
  const suggestionCount = Math.max(0, Math.floor(maxSuggestions));
  const missingCoreEntries = Object.entries(getMissingCoreRequirements(sections))
    .filter((entry): entry is [CoreArea, number] => entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);

  if (suggestionCount === 0 || missingCoreEntries.length === 0) {
    return [];
  }

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

      if (bucket.length === 0) {
        continue;
      }

      const nextCourse = bucket.shift()!;
      suggestions.push(nextCourse);
      seenCourseIds.add(nextCourse.uniqueId);

      if (suggestions.length === suggestionCount) {
        break;
      }
    }
  }

  return suggestions;
}

const SidePanel = () => {
  const { sections } = useAuditContext();
  const gpaSection = sections.find((section) =>
    section.title.toLowerCase().includes("gpa"),
  );
  const gpaRule = gpaSection?.rules[0];
  const gpaSummary = parseGpaSummary(gpaRule?.text);

  return (
    <VStack
      fill
      className="h-full sticky top-[75px] z-20 bg-white"
      y="stretch"
      x="center"
    >
      <SimpleDegreeCompletionDonut size={300} />
      <VStack gap={4} className="w-sm mt-10">
        {gpaRule ? (
          <GPATotalsCard
            required={gpaRule.requiredHours}
            counted={gpaRule.appliedHours}
            hoursUsed={gpaSummary?.hoursUsed ?? 0}
            points={gpaSummary?.points ?? 0}
          />
        ) : null}
        <CreditHourTotalsCard
          requirements={[
            {
              met: true,
              hours: 21,
              description: "upper-division coursework in residence.",
            },
            {
              met: false,
              hours: 36,
              description: "upper-division coursework required.",
            },
          ]}
        />
      </VStack>
    </VStack>
  );
};

const isStandaloneSection = (title: string) => {
  const t = title.toLowerCase();
  return t.includes("core") || t.includes("credit");
};

const isPreUnifiedSection = (title: string) => title.toLowerCase().includes("core");
const isPostUnifiedSection = (title: string) => title.toLowerCase().includes("credit");

const MainContent = () => {
  const { progresses, sections, history, currentAuditId } = useAuditContext();
  const nonGPASections = sections.filter(
    (section) => !section.title.toLowerCase().includes("gpa"),
  );

  const currentAudit = history.audits.find((a) => a.auditId === currentAuditId);
  const degreeTitle =
    currentAudit?.majors?.join("; ") ?? currentAudit?.title ?? "Degree Audit";

  const preUnifiedSections = nonGPASections.filter((s) => isPreUnifiedSection(s.title));
  const postUnifiedSections = nonGPASections.filter((s) => isPostUnifiedSection(s.title));
  const unifiedSectionInputs = nonGPASections.filter((s) => !isStandaloneSection(s.title));

  const unifiedSections = unifiedSectionInputs
    .map((section) => {
      const originalIdx = sections.findIndex((s) => s.title === section.title);
      const sectionProgress = progresses.sections[originalIdx];
      if (!sectionProgress || sectionProgress.progress.total <= 0) return null;
      return {
        title: section.title,
        hours: sectionProgress.progress,
        requirements: section.rules ?? [],
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const renderStandalone = (section: (typeof nonGPASections)[0], colorIndex: number) => {
    const originalIdx = sections.findIndex((s) => s.title === section.title);
    const sectionProgress = progresses.sections[originalIdx];
    return (
      sectionProgress?.progress.total > 0 && (
        <RequirementBreakdown
          key={section.title}
          title={section.title}
          hours={sectionProgress.progress}
          requirements={section.rules ?? []}
          colorIndex={colorIndex}
        />
      )
    );
  };

  return (
    <VStack fill className="w-full">
      <Title text="Degree Progress Overview" />
      {preUnifiedSections.map((section, idx) => renderStandalone(section, idx))}
      {unifiedSections.length > 0 && (
        <UnifiedDegreeCard degreeTitle={degreeTitle} sections={unifiedSections} />
      )}
      {postUnifiedSections.map((section, idx) =>
        renderStandalone(section, preUnifiedSections.length + idx),
      )}
    </VStack>
  );
};

const DegreeAuditPage = () => {
  const { sections } = useAuditContext();
  const { setRecommendedCourses } = useCourseModalContext();

  useEffect(() => {
    async function logCoreSuggestions() {
      const suggestedCourses = await getSuggestedCoreCourses(sections);
      setRecommendedCourses(suggestedCourses);
      console.log(
        "[DegreeAuditPage] Missing core requirements:",
        getMissingCoreRequirements(sections),
      );
      console.log(
        "[DegreeAuditPage] Suggested core courses:",
        suggestedCourses,
      );
    }

    logCoreSuggestions().catch((error) => {
      console.error("[DegreeAuditPage] Failed to load core suggestions:", error);
    });
  }, [sections, setRecommendedCourses]);

  return (
    <HStack fill x="between" className="h-full w-full" gap={8}>
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreeAuditPage;
