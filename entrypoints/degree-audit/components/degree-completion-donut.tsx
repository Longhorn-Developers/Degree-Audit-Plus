import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import MultiDonutGraph, {
  Bar,
  GraphStyleProps,
} from "@/entrypoints/degree-audit/components/graph";
import { PlanableProgress } from "@/lib/general-types";
import { CATEGORY_COLORS, formatMajorLabel } from "@/lib/utils";
import { useAuditContext } from "../providers/audit-provider";

const isStandaloneSection = (title: string) => {
  const t = title.toLowerCase();
  return t.includes("core") || t.includes("credit");
};

const isPreUnifiedSection = (title: string) =>
  title.toLowerCase().includes("core");
const isPostUnifiedSection = (title: string) =>
  title.toLowerCase().includes("credit");

function buildDonutBars(
  sections: { title: string; progress: PlanableProgress }[],
  unifiedTitle: string,
): Bar[] {
  const nonGPA = sections.filter((s) => !s.title.toLowerCase().includes("gpa"));
  const preUnified = nonGPA.filter((s) => isPreUnifiedSection(s.title));
  const postUnified = nonGPA.filter((s) => isPostUnifiedSection(s.title));
  const unified = nonGPA.filter((s) => !isStandaloneSection(s.title));

  const bars: Bar[] = [];

  preUnified.forEach((section, idx) => {
    if (section.progress.total > 0) {
      bars.push({
        title: section.title,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length].rgb,
        percentage: section.progress,
      });
    }
  });

  const unifiedTotal = unified.reduce((sum, s) => sum + s.progress.total, 0);
  if (unifiedTotal > 0) {
    bars.push({
      title: unifiedTitle,
      color: CATEGORY_COLORS[5].rgb,
      percentage: {
        current: unified.reduce((sum, s) => sum + s.progress.current, 0),
        planned: unified.reduce((sum, s) => sum + s.progress.planned, 0),
        total: unifiedTotal,
      },
    });
  }

  postUnified.forEach((section, idx) => {
    if (section.progress.total > 0) {
      bars.push({
        title: section.title,
        color:
          CATEGORY_COLORS[(preUnified.length + idx) % CATEGORY_COLORS.length]
            .rgb,
        percentage: section.progress,
      });
    }
  });

  return bars;
}

const DegreeCompletionDonut = (styleProps: GraphStyleProps) => {
  const { progresses, history, currentAuditId } = useAuditContext();
  const currentAudit = history?.audits?.find(
    (a, i) => (a.auditId || String(i)) === currentAuditId,
  );
  const unifiedTitle =
    currentAudit?.majors?.map(formatMajorLabel).join("; ") ??
    "Degree Requirements";
  const bars = buildDonutBars(progresses.sections, unifiedTitle);

  const overallPercentage =
    (currentAudit?.percentage ??
      Math.round((progresses.total.current / progresses.total.total) * 100)) ||
    0;

  return (
    <MultiDonutGraph
      {...styleProps}
      bars={bars}
      tooltipContent={(bar) => (
        <VStack
          className="p-2 rounded-md border-2 font-bold bg-gray-200 shadow-md shadow-black/20 w-full"
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
        <div className="text-lg leading-tight w-min text-center">
          Degree Completion
        </div>
      </VStack>
    </MultiDonutGraph>
  );
};

export const SimpleDegreeCompletionDonut = (styleProps: GraphStyleProps) => {
  const { progresses, history, currentAuditId } = useAuditContext();
  const currentAudit = history?.audits?.find(
    (a, i) => (a.auditId || String(i)) === currentAuditId,
  );
  const unifiedTitle =
    currentAudit?.majors?.map(formatMajorLabel).join("; ") ??
    "Degree Requirements";
  const bars = buildDonutBars(progresses.sections, unifiedTitle);

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
          className="p-2 rounded-md border-2 font-bold bg-gray-200 shadow-md shadow-black/20 w-full"
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
