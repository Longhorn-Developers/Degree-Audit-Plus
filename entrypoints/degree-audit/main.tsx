import "@/entrypoints/styles/content.css";
import clsx from "clsx";
import React from "react";
import ReactDOM from "react-dom/client";
import { HStack, VStack } from "../components/common/helperdivs";
import { PreferencesProvider, usePreferences } from "../providers/main-page";
import AuditContextProvider from "./components/audit-provider";
import { CourseModalContextProvider } from "./components/course-modal-provider.tsx";
import DegreeAuditPage from "./components/degree-audit-page.tsx";
import DegreePlannerPage from "./components/degree-planner-page copy.tsx";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar.tsx";

const App = () => {
	return (
		<PreferencesProvider>
			<AuditContextProvider>
				<CourseModalContextProvider>
					<HStack fill className="w-screen" gap={0}>
						<Sidebar />
						<MainContent />
					</HStack>
				</CourseModalContextProvider>
			</AuditContextProvider>
		</PreferencesProvider>
	);
};

const MainContent = () => {
	const { sidebarIsOpen, viewMode } = usePreferences();

	return (
		<VStack
			fill
			x="center"
			className={clsx("w-full transition-[margin-left] duration-300 ease-out", {
				"ml-[375px]": sidebarIsOpen,
				"ml-0": !sidebarIsOpen,
			})}
		>
			<Navbar />
			<VStack x="center" className="w-[80%] max-w-7xl mx-auto mb-[30px]">
				{viewMode === "audit" ? <DegreeAuditPage /> : <DegreePlannerPage />}
			</VStack>
		</VStack>
	);
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
