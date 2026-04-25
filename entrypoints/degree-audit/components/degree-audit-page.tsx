import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import { CourseSearchPanel } from "@/entrypoints/components/course-add-modal";
import "@/entrypoints/styles/content.css";
import { formatMajorLabel } from "@/lib/utils";
import { useAuditContext } from "../providers/audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import { CreditHourTotalsCard, GPATotalsCard } from "./gpa-credit-cards";
import RequirementBreakdown, {
  UnifiedDegreeCard,
} from "./requirement-breakdown";

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

const SidePanel = () => {
  const { sections } = useAuditContext();
  const gpaSection = sections.find((section) =>
    section.title.toLowerCase().includes("gpa"),
  );
  const gpaRule = gpaSection?.rules[0];
  const gpaSummary = parseGpaSummary(gpaRule?.text);

  return (
    <VStack
      className="self-start sticky top-0 z-20 bg-white"
      y="stretch"
      x="center"
    >
      <SimpleDegreeCompletionDonut size={300} />
      <div className="w-sm mt-10 p-3 rounded-lg border border-gray-200 bg-[#FAFAF9]">
        <CourseSearchPanel />
      </div>
      <VStack gap={4} className="w-sm mt-4">
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

const isPreUnifiedSection = (title: string) =>
  title.toLowerCase().includes("core");
const isPostUnifiedSection = (title: string) =>
  title.toLowerCase().includes("credit");

const MainContent = () => {
  const { progresses, sections, history, currentAuditId } = useAuditContext();
  const nonGPASections = sections.filter(
    (section) => !section.title.toLowerCase().includes("gpa"),
  );

  const currentAudit = history.audits.find((a) => a.auditId === currentAuditId);
  const degreeTitle =
    currentAudit?.majors?.map(formatMajorLabel).join("; ") ??
    currentAudit?.title ??
    "Degree Audit";

  const preUnifiedSections = nonGPASections.filter((s) =>
    isPreUnifiedSection(s.title),
  );
  const postUnifiedSections = nonGPASections.filter((s) =>
    isPostUnifiedSection(s.title),
  );
  const unifiedSectionInputs = nonGPASections.filter(
    (s) => !isStandaloneSection(s.title),
  );

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

  const renderStandalone = (
    section: (typeof nonGPASections)[0],
    colorIndex: number,
  ) => {
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
    <VStack className="w-full">
      <Title text="Degree Progress Overview" />
      {preUnifiedSections.map((section, idx) => renderStandalone(section, idx))}
      {unifiedSections.length > 0 && (
        <UnifiedDegreeCard
          degreeTitle={degreeTitle}
          sections={unifiedSections}
        />
      )}
      {postUnifiedSections.map((section, idx) =>
        renderStandalone(section, preUnifiedSections.length + idx),
      )}
    </VStack>
  );
};

const DegreeAuditPage = () => {
  return (
    <HStack fill x="between" className="w-full" gap={8}>
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreeAuditPage;
