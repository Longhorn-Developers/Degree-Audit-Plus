import { Course } from "@/lib/general-types";
import { ListIcon } from "@phosphor-icons/react";
import React from "react";
import ReactDOM from "react-dom/client";
import Button from "../components/common/button";
import { HStack, VStack } from "../components/common/helperdivs";
import DegreeProgressOverviewCard from "../components/degree-progress-overview-card";
import { PreferencesProvider, usePreferences } from "../providers/main-page";
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

const App = () => {
	return (
		<PreferencesProvider>
			<DegreeAuditPage />
		</PreferencesProvider>
	);
};

const Sidebar = () => {
	const { sidebarIsOpen, toggleSidebar } = usePreferences();
	const maxWidth = 400;

	return (
		<VStack
			className="h-full py-6 border-gray-200"
			style={{
				width: sidebarIsOpen ? maxWidth : 0,
				opacity: sidebarIsOpen ? 1 : 0,
				borderRightWidth: sidebarIsOpen ? 4 : 0,
				transition:
					"width 0.3s ease-in-out, opacity 0.1s ease-in-out, border-right-width 0.3s ease-in-out",
			}}
			aria-hidden={!sidebarIsOpen}
		>
			<Button
				className="p-2 rounded-full"
				fill="none"
				onClick={async () => await toggleSidebar()}
			>
				<ListIcon className="w-6 h-6" />
			</Button>
		</VStack>
	);
};

const MainContent = ({ children }: { children: React.ReactNode }) => {
	return (
		<VStack fill x="center" className="w-full">
			{children}
		</VStack>
	);
};

const DegreeAuditPage = () => {
	return (
		<HStack fill className="w-screen h-screen" gap={0}>
			<Sidebar />
			<MainContent>
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
			</MainContent>
		</HStack>
	);
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
