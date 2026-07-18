import { HStack, VStack } from "@/components/ui/stack";
import MultiDonutGraph, { Bar, GraphStyleProps } from "./graph";
import { CATEGORY_COLORS } from "@/lib/utils";
import { useAuditContext } from "@/features/audit/audit-provider";
import { groupAuditSections } from "@/features/audit/section-groups";

const DegreeCompletionDonut = (styleProps: GraphStyleProps) => {
  const { progresses, sections, currentAudit, currentAuditName } =
    useAuditContext();
  const { pre, unified, post } = groupAuditSections(sections, progresses);

  const bars: Bar[] = [];

  pre.forEach((section, idx) => {
    bars.push({
      title: section.title,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length].rgb,
      percentage: section.progress,
    });
  });

  if (unified.length > 0) {
    bars.push({
      title: currentAuditName,
      color: CATEGORY_COLORS[5].rgb,
      percentage: {
        current: unified.reduce((sum, s) => sum + s.progress.current, 0),
        planned: unified.reduce((sum, s) => sum + s.progress.planned, 0),
        total: unified.reduce((sum, s) => sum + s.progress.total, 0),
      },
    });
  }

  post.forEach((section, idx) => {
    bars.push({
      title: section.title,
      color: CATEGORY_COLORS[(pre.length + idx) % CATEGORY_COLORS.length].rgb,
      percentage: section.progress,
    });
  });

  const overallPercentage =
    (currentAudit?.percentage ??
      Math.round((progresses.total.current / progresses.total.total) * 100)) ||
    0;
  return (
    <MultiDonutGraph
      {...styleProps}
      gap={0}
      barEndRounding="square"
      bars={bars}
      darkeningFactor={0.9}
      plannedOpacity={0.8}
      bgOpacity={0.2}
      tooltipCorner="bottom-left"
      tooltipContent={(bar) => (
        <VStack
          className="p-2 rounded-md border-2 font-bold bg-hover-bg shadow-md shadow-black/20 w-full"
          style={{ borderColor: bar.color, color: bar.color }}
        >
          <HStack
            x="between"
            y="middle"
            fill
            className="whitespace-nowrap text-xl font-bold"
          >
            <p>{bar.title}</p>
            <p>
              {Math.round(
                (bar.percentage.current / bar.percentage.total) * 100,
              )}
              %
            </p>
          </HStack>
          <div className="text-sm">
            ({bar.percentage.current}/{bar.percentage.total}) courses completed
          </div>
        </VStack>
      )}
    >
      <VStack centered gap={0}>
        <div className="text-2xl font-bold">{overallPercentage}%</div>
        <div className="text-lg leading-tight text-center w-[80%]">
          Degree Completion
        </div>
      </VStack>
    </MultiDonutGraph>
  );
};

export default DegreeCompletionDonut;
