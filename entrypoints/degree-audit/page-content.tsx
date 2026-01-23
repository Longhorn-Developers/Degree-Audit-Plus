import { Course } from "@/lib/general-types";
import { useState } from "react";
import { HStack, VStack } from "../components/common/helperdivs";
import { Title } from "../components/common/text";
import DegreeProgressOverviewCard from "../components/degree-progress-overview-card";
import { usePreferences } from "../providers/main-page";
import MultiDonutGraph, { type Bar } from "./components/graph";
import Navbar from "./components/navbar";
import RequirementBreakdown from "./components/requirement-breakdown";

const widthAnimationTime = 0.3;

const DUMMY_DATA = {
	donutGraph: [
		{
			title: "Major(s)",
			color: "rgb(99, 102, 241)", // soft indigo-500
			percentage: {
				current: 5,
				total: 20,
			},
		},
		{
			title: "Minor(s) + Certificate(s)",
			color: "rgb(52, 211, 153)", // teal-400
			percentage: {
				current: 100,
				total: 200,
			},
		},
		{
			title: "Core",
			color: "rgb(251, 191, 36)", // yellow-400
			percentage: {
				current: 5,
				total: 20,
			},
		},
		{
			title: "Free Electives",
			color: "rgb(237, 137, 212)", // pink-300
			percentage: {
				current: 20,
				total: 20,
			},
		},
		{
			title: "Electives",
			color: "rgb(156, 163, 175)",
			percentage: {
				current: 25,
				total: 30,
			},
		},
	] satisfies Bar[],
	courseBreakdown: {
		hoursCompleted: 10,
		hoursInProgress: 4,
		hoursRequired: 20,
		creditsCompleted: 10,
		creditsRequired: 20,
		courses: [
			{
				name: "Course 1",
				hours: 3,
				credits: 3,
				semester: "spring 2025",
				status: "Completed",
				grade: "A",
				code: "CS 101",
			},
			{
				name: "Course 2",
				hours: 3,
				credits: 3,
				semester: "spring 2025",
				status: "In Progress",
				grade: "B",
				code: "CS 102",
			},
			{
				name: "Course 3",
				hours: 3,
				credits: 3,
				semester: "spring 2025",
				status: "Not Started",
				grade: "C",
				code: "CS 101",
			},
		] satisfies Course[],
	},
};

const DegreeCompletionPercentage = () => {
	const [bars, setBars] = useState<Bar[]>(DUMMY_DATA["donutGraph"]);

	return (
		<MultiDonutGraph
			bars={bars}
			innerContent={
				<VStack centered gap={0}>
					<div className="text-2xl font-bold">XX%</div>
					<div className="text-lg w-min text-center">Degree Completion</div>
				</VStack>
			}
			tooltipContent={(bar) => (
				<VStack className="p-2 rounded-md border font-bold bg-white w-full border-gray-300">
					<HStack
						x="between"
						y="middle"
						fill
						className="whitespace-nowrap text-xl font-bold"
					>
						<p style={{ color: bar.color }}>{bar.title}</p>
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
		/>
	);
};

const PageContent = () => {
	const { sidebarIsOpen, sidebarSize, isDraggingSidebar } = usePreferences();
	const dummyData = DUMMY_DATA["courseBreakdown"];

	return (
		<VStack
			fill
			x="center"
			className="w-full"
			style={{
				marginLeft: sidebarIsOpen ? sidebarSize : 0,
				transition: isDraggingSidebar
					? "none"
					: `margin-left ${widthAnimationTime}s ease-in-out`,
			}}
		>
			<Navbar />
			<VStack x="center" className="w-[80%] max-w-7xl mx-auto">
				<Title text="Degree Progress Overview" />
				<DegreeCompletionPercentage />
				<Title text="Degree Checklist" />
				<DegreeProgressOverviewCard
					hoursCompleted={dummyData.hoursCompleted}
					hoursInProgress={dummyData.hoursInProgress}
					hoursRequired={dummyData.hoursRequired}
					creditsCompleted={dummyData.creditsCompleted}
					creditsRequired={dummyData.creditsRequired}
				/>
				<RequirementBreakdown
					title="Core"
					hours={{ current: 5, total: 20 }}
					credits={{ current: 10, total: 20 }}
					courses={dummyData.courses}
				/>
				<RequirementBreakdown
					title="Major(s)"
					hours={{ current: 5, total: 20 }}
					credits={{ current: 10, total: 20 }}
					courses={dummyData.courses}
				/>
				<RequirementBreakdown
					title="Minor(s) + Certificate(s)"
					hours={{ current: 5, total: 20 }}
					credits={{ current: 10, total: 20 }}
					courses={dummyData.courses}
				/>
				<RequirementBreakdown
					title="Electives"
					hours={{ current: 5, total: 20 }}
					credits={{ current: 10, total: 20 }}
					courses={dummyData.courses}
				/>
			</VStack>
		</VStack>
	);
};

export default PageContent;
