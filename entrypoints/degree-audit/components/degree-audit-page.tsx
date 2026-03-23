import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { useAuditContext } from "../providers/audit-provider";
import { SimpleDegreeCompletionDonut } from "./degree-completion-donut";
import RequirementBreakdown from "./requirement-breakdown";

const GpaSummaryCard = () => {
  const { sections } = useAuditContext();
  const gpaSection = sections.find((section) =>
    section.title.toLowerCase().includes("gpa"),
  );
  const gpaRule = gpaSection?.rule[0];

  if (!gpaRule) {
    return null;
  }

  return (
    <div className="w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900">GPA Totals</h3>
        <div className="rounded-lg bg-[#4A7C59] px-4 py-2 text-lg font-semibold text-white">
          {gpaRule.appliedHours.toFixed(4)}
        </div>
      </div>

      <div className="mt-4 flex gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Required</span>
          <div className="rounded-lg border border-gray-300 px-4 py-2">
            <span className="text-lg font-semibold">
              {gpaRule.requiredHours.toFixed(4)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Remaining</span>
          <div className="rounded-lg border border-gray-300 px-4 py-2">
            <span className="text-lg font-semibold">
              {Math.max(gpaRule.remainingHours, 0).toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-600">{gpaRule.text}</p>
    </div>
  );
};

const SidePanel = () => {
  return (
    <VStack
      fill
      className="h-full sticky top-[75px] z-20 bg-white"
      y="stretch"
      x="center"
    >
      <SimpleDegreeCompletionDonut size={300} />
      <div className="mt-10">
        <GpaSummaryCard />
      </div>
    </VStack>
  );
};

const MainContent = () => {
  const { progresses, sections } = useAuditContext();
  const checklistSections = sections.filter(
    (section) => !section.title.toLowerCase().includes("gpa"),
  );

  return (
    <VStack fill className="w-full">
      <Title text="Degree Progress Overview" />
      <Title text="Degree Checklist" />
      {checklistSections.map((section) => {
        const sectionIndex = sections.findIndex((item) => item === section);
        return (
          progresses.sections[sectionIndex]?.progress.total > 0 && (
            <RequirementBreakdown
              key={section.title || `section-${sectionIndex}`}
              title={section.title}
              hours={progresses.sections[sectionIndex].progress}
              requirements={section.rule ?? []}
              colorIndex={sectionIndex}
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
