import { CheckIcon, HourglassIcon, LockKeyIcon } from "@phosphor-icons/react";
import Container from "./common/container";
import { HStack, VStack } from "./common/helperdivs";
import { MultiValueProgressBar } from "./common/progress-bar";

type ProgressOverview = {
	hoursCompleted: number;
	hoursInProgress: number;
	hoursRequired: number;
	creditsCompleted: number;
	creditsRequired: number;
};

const DegreeProgressOverviewCard = (props: ProgressOverview) => {
	const { hoursCompleted, hoursInProgress, hoursRequired } = props;

	return (
		<Container>
			<VStack>
				<h1 className="text-2xl font-bold mb-4">Degree Progress Overview</h1>
				<MultiValueProgressBar
					className="h-7"
					values={[
						{ ammount: hoursCompleted, className: "bg-gray-800" },
						{
							ammount: hoursCompleted + hoursInProgress,
							className: "bg-gray-600",
						},
					]}
					total={hoursRequired}
				/>
				<HStack x="around" y="middle" fill className="mt-4">
					<HourDot type="Completed" ammount={hoursCompleted} />
					<HourDot type="In Progress" ammount={hoursInProgress} />
					<HourDot type="Required" ammount={hoursRequired} />
				</HStack>
				<Container>
					<HStack x="between" y="middle">
						<VStack gap={0}>
							<div className="text-lg font-bold">Estimated time to degree</div>
							<div>Based on your current progress</div>
						</VStack>
						<VStack gap={0} x="right">
							<div className="text-lg font-bold">00</div>
							<div>semesters</div>
						</VStack>
					</HStack>
				</Container>
			</VStack>
		</Container>
	);
};

const HourDot = (props: {
	type: "Completed" | "In Progress" | "Required";
	ammount: number;
}) => {
	const { type, ammount } = props;

	const icon = {
		Completed: <CheckIcon className="w-6 h-6" />,
		"In Progress": <HourglassIcon className="w-6 h-6" />,
		Required: <LockKeyIcon className="w-6 h-6" />,
	} satisfies Record<typeof type, React.ReactNode>;

	return (
		<VStack x="center" y="middle" gap={2}>
			<div className="h-10 w-10 rounded-full border-2 border-gray-900 flex items-center justify-center bg-gray-300">
				{icon[type]}
			</div>
			<VStack gap={0} x="center">
				<div className="text-lg font-bold">
					{ammount.toString().padStart(2, "0")}
				</div>
				<div className="text-sm text-gray-500">{type}</div>
			</VStack>
		</VStack>
	);
};

export default DegreeProgressOverviewCard;
