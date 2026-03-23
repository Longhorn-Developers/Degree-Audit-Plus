import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { useAuditContext } from "../providers/audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import { CreditHourTotalsCard, GPATotalsCard } from "./gpa-credit-cards";
import RequirementBreakdown from "./requirement-breakdown";

const SidePanel = () => {
  const { sections } = useAuditContext();
  const gpaSection = sections.find((section) =>
    section.title.toLowerCase().includes("gpa"),
  );
  const gpaRule = gpaSection?.rule?.[0];

  return (
    <VStack
      fill
      className="h-full sticky top-[75px] z-20 bg-white"
      y="stretch"
      x="center"
    >
      <SimpleDegreeCompletionDonut size={300} />
      <VStack gap={4} className="w-sm mt-10">
        <GPATotalsCard
          required={gpaRule?.requiredHours ?? 2.0}
          counted={gpaRule?.appliedHours ?? 0.0}
          hoursUsed={80}
          points={320}
        />
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
        const originalIdx = sections.findIndex((s) => s.title === section.title);
        const sectionProgress = progresses.sections[originalIdx];

        return (
          sectionProgress?.progress.total > 0 && (
            <RequirementBreakdown
              key={section.title || `section-${originalIdx}`}
              title={section.title}
              hours={sectionProgress.progress}
              requirements={section.rule ?? []}
              colorIndex={originalIdx}
            />
          )
        );
      })}
    </VStack>
  );
};

const DegreeAuditPage = () => {
  return (
    <HStack fill x="between" className="h-full w-full" gap={8}>
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreeAuditPage;
