import {
  Course,
  RequirementSection,
  DegreeAuditCardProps,
} from "@/lib/general-types";
import { getAuditHistory, getAuditData, saveAuditData } from "@/lib/storage";
import React, { useState, createContext, useContext } from "react";
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
import dapLogo from "../../public/dap-logo.png";
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

// Context for sharing audit data betw sidebar and main
interface AuditContextType {
  sections: RequirementSection[];
  currentAuditId: string | null;
  setCurrentAuditId: (id: string | null) => void;
}
const AuditContext = createContext<AuditContextType>({
  sections: [],
  currentAuditId: null,
  setCurrentAuditId: () => {},
});
const useAuditContext = () => useContext(AuditContext);

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
  const [sections, setSections] = useState<RequirementSection[]>([]);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId") // look at broswer
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load audit data dynamicly
  React.useEffect(() => {
    if (!currentAuditId) return;

    async function loadAudit() {
      // 1. Check broswer first
      const cached = await getAuditData(currentAuditId!);
      if (cached) {
        console.log("Loaded from cache:", currentAuditId);
        setSections(cached.requirements);
        return;
      }
      // 2. If not cached, scrape
      console.log("Not in cache, scraping:", currentAuditId);
      setIsLoading(true);
      const url = `https://utdirect.utexas.edu/apps/degree/audits/results/${currentAuditId}/`;
      browser.runtime.sendMessage({ type: "SCRAPE_AUDIT", url });
    }
    loadAudit();
  }, [currentAuditId]);

  // Listen for scraper results & cache them
  React.useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "AUDIT_RESULTS" && currentAuditId) {
        console.log("Received audit data, caching:", currentAuditId);
        setSections(message.requirements as RequirementSection[]);
        saveAuditData(currentAuditId, {
          requirements: message.requirements,
          courses: message.data,
        });
        setIsLoading(false);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [currentAuditId]);

  return (
    <PreferencesProvider>
      <AuditContext.Provider
        value={{ sections, currentAuditId, setCurrentAuditId }}
      >
        <DegreeAuditPage />
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#bf5700] border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-semibold text-gray-800">
                Loading audit data...
              </p>
            </div>
          </div>
        )}
      </AuditContext.Provider>
    </PreferencesProvider>
  );
};

const Sidebar = () => {
  const { sidebarIsOpen, toggleSidebar } = usePreferences();
  const { currentAuditId, setCurrentAuditId } = useAuditContext();
  const [audits, setAudits] = useState<DegreeAuditCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadAudits() {
      try {
        const data = await getAuditHistory();
        if (data && !data.error) {
          setAudits(data.audits);
        }
      } catch (e) {
        console.error("Error loading audit history:", e);
      } finally {
        setLoading(false);
      }
    }
    loadAudits();
  }, []);

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
          <img src={dapLogo} alt="DAP Logo" className="w-12 h-12" />
          <span className="text-dap-orange font-semibold text-xl">
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
          {loading ? (
            <p className="text-sm text-gray-500">Loading audits...</p>
          ) : audits.length === 0 ? (
            <p className="text-sm text-gray-500">No audits found</p>
          ) : (
            audits.map((audit, index) => {
              const id = audit.auditId || String(index);
              return (
                <DegreeAuditCard
                  key={id}
                  title={audit.title}
                  majors={audit.majors}
                  minors={audit.minors}
                  percentage={audit.percentage}
                  isSelected={currentAuditId === id}
                  isExpanded={currentAuditId === id}
                  onToggle={() => {
                    if (audit.auditId) {
                      setCurrentAuditId(audit.auditId); // No page refresh, just update state
                    }
                  }}
                  onMenuClick={() => {
                    console.log("Menu clicked for", audit.title);
                  }}
                />
              );
            })
          )}
        </div>

        {/* Divider */}
        <hr className="my-5 border-[#eae8e1]" />

        {/* RESOURCES Section */}
        <div className="text-[25px] font-bold text-[#040506] tracking-[-0.19px]">
          RESOURCES
        </div>
        <div className="mt-3 flex flex-col gap-2 ">
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            UT Core Requirements <ArrowSquareOut size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            UT Degree Plans <ArrowSquareOut size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            Registration Info Sheet (RIS) <ArrowSquareOut size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
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
            <span className="text-[#bf5700] font-semibold">
              MADE WITH LOVE, BY
            </span>
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

// Helper to calculate total hours for a section
const calcSectionHours = (section?: RequirementSection) => {
  if (!section) return { current: 0, total: 0 };
  const rules = section.rules;
  return {
    current: rules.reduce((sum, r) => sum + r.appliedHours, 0),
    total: rules.reduce((sum, r) => sum + r.requiredHours, 0),
  };
};

// Section titles by index
const SECTION_TITLES = [
  "Core Curriculum",
  "General Education",
  "Major(s)",
  "Minor(s) + Certificate(s)",
  "GPA Totals",
  "Credit Hour Totals",
];

const DegreeAuditPage = () => {
  const dummyData = DUMMY_DATA["courseBreakdown"];
  const { sections } = useAuditContext();
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
        <VStack x="center" className="w-[80%] max-w-7xl mx-auto mb-[30px]">
          <Title text="Degree Progress Overview" />
          <DegreeCompletionPercentage />
          <Title text="Degree Checklist" />
          {/* <DegreeProgressOverviewCard
            hoursCompleted={dummyData.hoursCompleted}
            hoursInProgress={dummyData.hoursInProgress}
            hoursRequired={dummyData.hoursRequired}
            creditsCompleted={dummyData.creditsCompleted}
            creditsRequired={dummyData.creditsRequired}
          /> */}
          {SECTION_TITLES.map((title, idx) => (
            <RequirementBreakdown
              key={title}
              title={title}
              hours={calcSectionHours(sections[idx])}
              requirements={sections[idx]?.rules ?? []}
              onAddCourse={handleOpenModal}
              colorIndex={idx}
            />
          ))}
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
          className="p-2 rounded-md border border-2 font-bold bg-gray-200 shadow-md shadow-black/20 w-full"
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
