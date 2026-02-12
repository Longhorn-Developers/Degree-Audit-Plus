import Title from "@/entrypoints/components/common/text";
import "@/entrypoints/styles/content.css";
import { useAuditContext } from "./audit-provider";
import DegreeCompletionDonut from "./degree-completion-donut";
import RequirementBreakdown from "./requirement-breakdown";

const DegreeAuditPage = () => {
  const { progresses, sections } = useAuditContext();
  return (
    <>
      <Title text="Degree Progress Overview" />
      <DegreeCompletionDonut />
      <Title text="Degree Checklist" />
      {sections.map(
        (section, idx) =>
          progresses.sections[idx]?.progress.total > 0 && (
            <RequirementBreakdown
              key={section.title || `section-${idx}`}
              title={section.title}
              hours={progresses.sections[idx].progress}
              requirements={section.rules ?? []}
              colorIndex={idx}
            />
          ),
      )}
    </>
  );
};

export default DegreeAuditPage;
