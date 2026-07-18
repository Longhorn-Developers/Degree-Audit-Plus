import "@/entrypoints/styles/content.css";
import { seedDatabase } from "@/features/catalog/seed-catalog";
import { cn } from "@/lib/utils";
import React from "react";
import ReactDOM from "react-dom/client";
import { HStack, VStack } from "@/components/ui/stack";
import DegreeAuditPage from "@/features/dashboard/degree-audit-page";
import CourseAddModal from "@/features/course-search/course-add-modal";
import CourseModalContextProvider from "@/features/course-search/course-modal-provider";
import DegreePlannerPage from "@/features/planner/degree-planner-page";
import AuditContextProvider from "@/features/audit/audit-provider";
import {
  PreferencesProvider,
  usePreferences,
} from "@/features/preferences/preferences-provider";
import Navbar from "@/features/dashboard/navbar";
import Sidebar from "@/features/dashboard/sidebar";
import ErrorBoundary from "@/components/error-boundary";

const App = () => {
  return (
    <PreferencesProvider>
      <div className="min-h-screen bg-background text-text">
        <AuditContextProvider>
          <CourseModalContextProvider>
            <HStack fill className="w-screen" gap={0}>
              <Sidebar />
              <MainContent />
            </HStack>
            <CourseAddModal />
          </CourseModalContextProvider>
        </AuditContextProvider>
      </div>
    </PreferencesProvider>
  );
};

const MainContent = () => {
  const { sidebarIsOpen, viewMode } = usePreferences();

  return (
    <VStack
      x="center"
      className={cn(
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
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

bootstrap().catch((error) => {
  console.error("[Degree Audit] Failed to initialize app:", error);
});
