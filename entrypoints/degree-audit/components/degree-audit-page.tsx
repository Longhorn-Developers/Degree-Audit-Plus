import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { useAuditContext } from "./audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import RequirementBreakdown from "./requirement-breakdown";
import { GPATotalsCard, CreditHourTotalsCard } from "./gpa-credit-cards";

const SidePanel = () => {
  const { sections } = useAuditContext();

  // Find GPA Totals section
  const gpaSection = sections.find((section) =>
    section.title.toLowerCase().includes("gpa"),
  );

  // Extract GPA values from first rule (if exists)
  const gpaRule = gpaSection?.rules?.[0];
  const requiredGPA = gpaRule?.requiredHours ?? 2.0;
  const currentGPA = gpaRule?.appliedHours ?? 0.0;

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
          required={requiredGPA}
          counted={currentGPA}
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

  // Filter out GPA Totals section from main content
  const nonGPASections = sections.filter(
    (section) => !section.title.toLowerCase().includes("gpa"),
  );

  return (
    <VStack fill className="w-full">
      <Title text="Degree Progress Overview" />
      {nonGPASections.map((section) => {
        // Find the correct progress index from original sections array
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
  return (
    <HStack fill x="between" className="h-full w-full" gap={8}>
      <MainContent />
      <SidePanel />
    </HStack>
  );
};

export default DegreeAuditPage;
