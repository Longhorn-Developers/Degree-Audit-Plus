import { Course } from "@/lib/general-types";
import React from "react";
import ReactDOM from "react-dom/client";
import { VStack } from "../components/common/helperdivs";
import DegreeProgressOverviewCard from "../components/degree-progress-overview-card";
import "../styles/content.css";
import Navbar from "./components/navbar";
import RequirementBreakdown from "./components/requirement-breakdown";

const dummyData = {
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
};

function DegreeAuditPage() {
	return (
		<VStack fill x="center">
			<Navbar />
			<VStack x="center" className="w-[80%] max-w-7xl mx-auto">
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
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
	<React.StrictMode>
		<DegreeAuditPage />
	</React.StrictMode>
);
