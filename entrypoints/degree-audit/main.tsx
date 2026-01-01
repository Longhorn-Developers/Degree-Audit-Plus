import { Course } from "@/lib/general-types";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import clsx from "clsx";
import Button from "../components/common/button";
import { HStack, VStack } from "../components/common/helperdivs";
import { Title } from "../components/common/text";
import Modal from "../components/common/modal";
import DegreeProgressOverviewCard from "../components/degree-progress-overview-card";
import { PreferencesProvider, usePreferences } from "../providers/main-page";
import "../styles/content.css";
import devImage from "../../public/developer_image.png";
import logoImage from "../../public/logo_image.png";
import lhdLogo from "../../public/icon/LHD Logo.png";
import DegreeAuditCard from "../components/audit-card";
import {
  Sidebar as SidebarIcon,
  DiscordLogo,
  GithubLogo,
  InstagramLogo,
  LinkedinLogo,
  Moon,
  Plus,
  ArrowSquareOut,
  Gear,
} from "@phosphor-icons/react";
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

const Sidebar = () => {
  const { sidebarIsOpen, toggleSidebar } = usePreferences();
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>("1");

  const audits = [
    {
      id: "1",
      title: "Degree Audit 1",
      majors: ["Informatics", "Design"],
      minors: ["Business", "Studio Art", "Elements of Computing"],
      percentage: 68,
    },
    {
      id: "2",
      title: "what if i try this",
      majors: ["Computer Science"],
      minors: [],
      percentage: 90,
    },
    {
      id: "3",
      title: "if i go crazy",
      majors: ["Mathematics"],
      minors: ["Physics"],
      percentage: 90,
    },
  ];

  return (
    <div
      className={clsx(
        "py-5 h-full min-h-screen flex flex-col fixed left-0 top-0 bg-white border-r border-[#eae8e1] overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out",
        {
          "max-w-[325px]": sidebarIsOpen,
          "max-w-0 pointer-events-none": !sidebarIsOpen,
        }
      )}
      aria-hidden={!sidebarIsOpen}
      {...(!sidebarIsOpen ? { inert: true } : {})}
    >
      {/* Header */}
      <div className="px-8 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-[#bf5700] rounded-full flex items-center justify-center">
            <img src="" />
          </div>
          <span className="text-[#bf5700] font-semibold text-xl">
            Degree Audit Plus
          </span>
        </div>
        <button
          className="p-1 hover:bg-black/5 rounded"
          onClick={toggleSidebar}
        >
          <SidebarIcon size={24} className="text-[#0f1215]" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8">
        {/* MY AUDITS Section */}
        <div className="flex items-center justify-between">
          <span className="text-[19px] font-bold text-[#040506] tracking-[-0.19px]">
            MY AUDITS
          </span>
          <button className="p-1 hover:bg-black/5 rounded">
            <Plus size={24} className="text-[#0f1215]" />
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {audits.map((audit) => (
            <DegreeAuditCard
              key={audit.id}
              title={audit.title}
              majors={audit.majors}
              minors={audit.minors}
              percentage={audit.percentage}
              isSelected={expandedAuditId === audit.id}
              isExpanded={expandedAuditId === audit.id}
              onToggle={() =>
                setExpandedAuditId(
                  expandedAuditId === audit.id ? null : audit.id
                )
              }
              onMenuClick={() => {
                console.log("Menu clicked for", audit.title);
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <hr className="my-5 border-[#eae8e1]" />

        {/* RESOURCES Section */}
        <div className="text-[19px] font-bold text-[#040506] tracking-[-0.19px]">
          RESOURCES
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href="#"
            className="text-[#bf5700] font-medium hover:underline flex items-center gap-1"
          >
            UT Core Requirements <ArrowSquareOut size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] font-medium hover:underline flex items-center gap-1"
          >
            UT Degree Plans <ArrowSquareOut size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] font-medium hover:underline flex items-center gap-1"
          >
            Registration Info Sheet (RIS) <ArrowSquareOut size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] font-medium hover:underline flex items-center gap-1"
          >
            Register for Courses <ArrowSquareOut size={14} />
          </a>
        </div>

        {/* Divider */}
        <hr className="my-5 border-[#eae8e1]" />

        {/* Feedback Link */}
        <a
          href="#"
          className="text-[#bf5700] font-semibold hover:underline flex items-center gap-1"
        >
          Send us Feedback! <ArrowSquareOut size={14} />
        </a>
      </div>

      {/* Footer */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <img src={lhdLogo} alt="Longhorn Developers" className="w-6 h-6" />
          <div className="text-sm">
            <span className="text-gray-600">MADE WITH LOVE, BY</span>
            <br />
            <span className="text-[#bf5700] font-semibold">
              LONGHORN DEVELOPERS
            </span>
          </div>
        </div>
        <div className="flex items-center justify-start gap-4 text-[#1a2024]">
          <a href="#" aria-label="Discord">
            <DiscordLogo size={24} />
          </a>
          <a href="#" aria-label="Instagram">
            <InstagramLogo size={24} />
          </a>
          <a href="#" aria-label="LinkedIn">
            <LinkedinLogo size={24} />
          </a>
          <a href="#" aria-label="GitHub">
            <GithubLogo size={24} />
          </a>
          <a href="#" aria-label="Dark Mode">
            <Moon size={24} />
          </a>
          <a href="#" aria-label="Settings">
            <Gear size={24} />
          </a>
        </div>
      </div>
    </div>
  );
};

const MainContent = ({ children }: { children: React.ReactNode }) => {
  const { sidebarIsOpen } = usePreferences();

  return (
    <VStack
      fill
      x="center"
      className={clsx("w-full transition-[margin-left] duration-300 ease-out", {
        "ml-[325px]": sidebarIsOpen,
        "ml-0": !sidebarIsOpen,
      })}
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
