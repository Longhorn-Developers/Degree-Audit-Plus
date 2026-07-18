import { HStack, VStack } from "@/components/ui/stack";
import Title from "@/components/ui/text";
import "@/entrypoints/styles/content.css";
import { CourseSearchPanel } from "../course-search/course-search-panel";
import { useAuditContext } from "@/features/audit/audit-provider";
import { groupAuditSections } from "@/features/audit/section-groups";
import DegreeSidePanel from "../shared/degree-side-panel";
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
    <DegreeSidePanel searchPanel={<CourseSearchPanel />}>
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
    </DegreeSidePanel>
  );
};

const MainContent = () => {
  const { progresses, sections, currentAuditName } = useAuditContext();
  const { pre, unified, post } = groupAuditSections(sections, progresses);

  return (
    <VStack className="w-full">
      <Title text="Degree Progress Overview" />
      {pre.map((section, idx) => (
        <RequirementBreakdown
          key={section.title}
          title={section.title}
          hours={section.progress}
          requirements={section.rules}
          colorIndex={idx}
        />
      ))}
      {unified.length > 0 && (
        <UnifiedDegreeCard
          degreeTitle={currentAuditName}
          sections={unified.map((section) => ({
            title: section.title,
            hours: section.progress,
            requirements: section.rules,
          }))}
        />
      )}
      {post.map((section, idx) => (
        <RequirementBreakdown
          key={section.title}
          title={section.title}
          hours={section.progress}
          requirements={section.rules}
          colorIndex={pre.length + idx}
        />
      ))}
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
