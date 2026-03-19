import "@/entrypoints/styles/content.css";
import clsx from "clsx";
import React from "react";
import ReactDOM from "react-dom/client";
import { HStack, VStack } from "../components/common/helperdivs";
import DegreeAuditPage from "./components/degree-audit-page.tsx";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar.tsx";
import DegreePlannerPage from "./planner-view/degree-planner-page.tsx";
import AuditContextProvider from "./providers/audit-provider.tsx";
import CourseModalContextProvider from "./providers/course-modal-provider.tsx";
import {
  PreferencesProvider,
  usePreferences,
} from "./providers/preferences-provider.tsx";

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
      <VStack x="center" className="px-10 mx-auto mb-[30px] w-full">
        {viewMode === "audit" ? <DegreeAuditPage /> : <DegreePlannerPage />}
      </VStack>
    </VStack>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById("degree-audit-plus-page-root-container")!,
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
