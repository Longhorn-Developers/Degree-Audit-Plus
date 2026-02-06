import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import MultiDonutGraph, {
	Bar,
	GraphStyleProps,
} from "@/entrypoints/degree-audit/components/graph";
import { useAuditContext } from "./audit-provider";
import { CATEGORY_COLORS } from "./requirement-breakdown";

const DegreeCompletionDonut = (styleProps: GraphStyleProps) => {
	const { progresses, completion } = useAuditContext();
	const bars = progresses.sections
		.filter((section) => section.progress.total > 0)
		.sort((a, b) => b.progress.total - a.progress.total)
		.map((section, index) => ({
			title: section.title,
			color: CATEGORY_COLORS[index % CATEGORY_COLORS.length].rgb,
			percentage: section.progress,
		})) satisfies Bar[];

	const overallPercentage = Math.round(completion);

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
								(bar.percentage.current / bar.percentage.total) * 100
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
	const { progresses, completion } = useAuditContext();
	const bars = progresses.sections
		.filter((section) => section.progress.total > 0)
		.sort((a, b) => b.progress.total - a.progress.total)
		.map((section, index) => ({
			title: section.title,
			color: CATEGORY_COLORS[index % CATEGORY_COLORS.length].rgb,
			percentage: section.progress,
		})) satisfies Bar[];

	const overallPercentage = Math.round(completion);

	return (
		<MultiDonutGraph {...styleProps} bars={bars}>
			<div className="text-2xl font-bold">{overallPercentage}%</div>
		</MultiDonutGraph>
	);
};

export default DegreeCompletionDonut;
