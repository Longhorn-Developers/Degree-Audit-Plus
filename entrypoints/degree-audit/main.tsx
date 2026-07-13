import "@/entrypoints/styles/content.css";
import { seedDatabase } from "@/features/catalog/seed-catalog";
import clsx from "clsx";
import React from "react";
import ReactDOM from "react-dom/client";
import { HStack, VStack } from "@/components/ui/stack";
import DegreeAuditPage from "@/features/audit/degree-audit-page";
import Navbar from "@/features/audit/components/navbar";
import Sidebar from "@/features/audit/components/sidebar";
import DegreePlannerPage from "@/features/planner/degree-planner-page";
import AuditContextProvider from "@/features/audit/audit-provider";
import CourseModalContextProvider from "@/features/catalog/course-modal-provider";
import {
  PreferencesProvider,
  usePreferences,
} from "@/features/preferences/preferences-provider";

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
      x="center"
      className={clsx(
        "w-full min-w-0 h-screen overflow-hidden transition-[margin-left] duration-300 ease-out",
        {
          "ml-[365px]": sidebarIsOpen,
          "ml-0": !sidebarIsOpen,
        },
      )}
    >
      <Navbar />
      <VStack
        x="center"
        className="px-10 mx-auto mb-[30px] w-full flex-1 overflow-y-auto"
      >
        {viewMode === "audit" ? <DegreeAuditPage /> : <DegreePlannerPage />}
      </VStack>
    </VStack>
  );
};

async function bootstrap() {
  await seedDatabase();

  const root = ReactDOM.createRoot(
    document.getElementById("degree-audit-plus-page-root-container")!,
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap().catch((error) => {
  console.error("[Degree Audit] Failed to initialize app:", error);
});
