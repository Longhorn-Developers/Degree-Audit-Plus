import { HStack, VStack } from "@/components/ui/stack";
import Title from "@/components/ui/text";
import { CourseSearchPanel } from "@/features/course-search/course-search-panel";
import { useAuditContext } from "@/features/audit/audit-provider";
import {
  isCreditSection,
  isGpaSection,
  parseGpaSummary,
} from "@/features/audit/audit-calculations";
import { groupAuditSections } from "./section-groups";
import DegreeSidePanel from "./degree-side-panel";
import { CreditHourTotalsCard, GPATotalsCard } from "./gpa-credit-cards";
import RequirementBreakdown, {
  UnifiedDegreeCard,
} from "./requirement-breakdown";

const SidePanel = () => {
  const { sections } = useAuditContext();

  const gpaSection = sections.find((section) => isGpaSection(section.title));
  const gpaRule = gpaSection?.rules[0];
  const gpaSummary = parseGpaSummary(gpaRule?.text);

  const creditSection = sections.find((section) =>
    isCreditSection(section.title),
  );
  const creditRequirements = (creditSection?.rules ?? []).map((rule) => ({
    status: rule.status,
    text: rule.text,
  }));

  return (
    <DegreeSidePanel searchPanel={<CourseSearchPanel />}>
      <VStack gap={4} className="w-sm mt-4">
        {gpaRule ? (
          <GPATotalsCard
            required={gpaRule.requiredHours}
            counted={gpaRule.appliedHours}
            summary={gpaSummary}
          />
        ) : null}
        {creditRequirements.length > 0 ? (
          <CreditHourTotalsCard requirements={creditRequirements} />
        ) : null}
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
