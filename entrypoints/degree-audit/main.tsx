import { Course } from "@/lib/general-types";
import { ListIcon } from "@phosphor-icons/react";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import Button from "../components/common/button";
import { HStack, VStack } from "../components/common/helperdivs";
import { Title } from "../components/common/text";
import Modal from "../components/common/modal";
import DegreeProgressOverviewCard from "../components/degree-progress-overview-card";
import { PreferencesProvider, usePreferences } from "../providers/main-page";
import "../styles/content.css";
import MultiDonutGraph, { Bar } from "./components/graph";
import Navbar from "./components/navbar";
import RequirementBreakdown from "./components/requirement-breakdown";

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

const App = () => {
  return (
    <PreferencesProvider>
      <DegreeAuditPage />
    </PreferencesProvider>
  );
};

const widthAnimationTime = 0.3;
const opacityAnimationTime = 0.1;

const Sidebar = () => {
  const { sidebarIsOpen, toggleSidebar } = usePreferences();
  const maxWidth = 400;

  return (
    <VStack
      className="h-full py-6 border-gray-200 fixed left-0 top-0"
      style={{
        width: sidebarIsOpen ? maxWidth : 0,
        opacity: sidebarIsOpen ? 1 : 0,
        borderRightWidth: sidebarIsOpen ? 4 : 0,
        transition: `width ${widthAnimationTime}s ease-in-out, opacity ${opacityAnimationTime}s ease-in-out, border-right-width ${widthAnimationTime}s ease-in-out`,
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
  const { sidebarIsOpen } = usePreferences();

  return (
    <VStack
      fill
      x="center"
      className="w-full"
      style={{
        marginLeft: sidebarIsOpen ? 400 : 0,
        transition: `margin-left ${widthAnimationTime}s ease-in-out`,
      }}
    >
      {children}
    </VStack>
  );
};

const DegreeAuditPage = () => {
  const dummyData = DUMMY_DATA["courseBreakdown"];
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <HStack fill className="w-screen" gap={0}>
      <Sidebar />
      <MainContent>
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
            onAddCourse={handleOpenModal}
          />
          <RequirementBreakdown
            title="Major(s)"
            hours={{ current: 5, total: 20 }}
            credits={{ current: 10, total: 20 }}
            courses={dummyData.courses}
            onAddCourse={handleOpenModal}
          />
          <RequirementBreakdown
            title="Minor(s) + Certificate(s)"
            hours={{ current: 5, total: 20 }}
            credits={{ current: 10, total: 20 }}
            courses={dummyData.courses}
            onAddCourse={handleOpenModal}
          />
          <RequirementBreakdown
            title="Electives"
            hours={{ current: 5, total: 20 }}
            credits={{ current: 10, total: 20 }}
            courses={dummyData.courses}
            onAddCourse={handleOpenModal}
          />
        </VStack>
      </MainContent>

      {/* Blank Modal for Adding Hypothetical Course */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Add Hypothetical Course"
        size="lg"
        position="center"
      >
        <div className="min-h-[200px] flex items-center justify-center text-gray-500">
          Modal content will go here
        </div>
      </Modal>
    </HStack>
  );
};

const DegreeCompletionPercentage = () => {
  const [bars, setBars] = useState<Bar[]>(DUMMY_DATA["donutGraph"]);

  return (
    <MultiDonutGraph
      bars={bars}
      tooltipContent={(bar) => (
        <VStack
          className="p-2 rounded-md border font-bold bg-gray-200 shadow-md shadow-black/20 w-full"
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
        <div className="text-2xl font-bold">XX%</div>
        <div className="text-lg w-min text-center">Degree Completion</div>
      </VStack>
    </MultiDonutGraph>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
