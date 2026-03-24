import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { AuditRequirement, CoreArea } from "@/lib/general-types";
import { useEffect } from "react";
import { useAuditContext } from "../providers/audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import { CreditHourTotalsCard, GPATotalsCard } from "./gpa-credit-cards";
import RequirementBreakdown from "./requirement-breakdown";

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

      return missing; // vbad
    },
    {},
  );
}

// TODO function to get potential classes
// need to make sure we handle compexities of the rules (like "2 of the following 3 classes") and also the fact that some classes can satisfy multiple requirements (like a class that satisfies both a core requirement and a major requirement)

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

const MainContent = () => {
  const { progresses, sections } = useAuditContext();
  const nonGPASections = sections.filter(
    (section) => !section.title.toLowerCase().includes("gpa"),
  );

  return (
    <VStack fill className="w-full">
      <Title text="Degree Progress Overview" />
      {nonGPASections.map((section) => {
        const originalIdx = sections.findIndex(
          (s) => s.title === section.title,
        );
        const sectionProgress = progresses.sections[originalIdx];

        return (
          sectionProgress?.progress.total > 0 && (
            <RequirementBreakdown
              key={section.title || `section-${originalIdx}`}
              title={section.title}
              hours={sectionProgress.progress}
              requirements={section.rules ?? []}
              colorIndex={originalIdx}
            />
          )
        );
      })}
    </VStack>
  );
};

const DegreeAuditPage = () => {
  const { sections } = useAuditContext();

  useEffect(() => {
    console.log(
      "[DegreeAuditPage] Missing core requirements:",
      getMissingCoreRequirements(sections),
    );
  }, [sections]);

  return (
    <HStack fill x="between" className="h-full w-full" gap={8}>
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreeAuditPage;
