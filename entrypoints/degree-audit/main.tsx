import {
  calculateWeightedDegreeCompletion,
  CurrentAuditProgress,
} from "@/lib/audit-calculations";
import {
  Course,
  DegreeAuditCardProps,
  RequirementSection,
} from "@/lib/general-types";
import { getAuditData, getAuditHistory } from "@/lib/storage";
import {
  ArrowSquareOut,
  DiscordLogo,
  Gear,
  GithubLogo,
  InstagramLogo,
  LinkedinLogo,
  Moon,
  Plus,
  Sidebar as SidebarIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import React, { createContext, useContext, useState } from "react";
import ReactDOM from "react-dom/client";
import dapLogo from "../../public/dap-logo.png";
import lhdLogo from "../../public/icon/LHD Logo.png";
import DegreeAuditCard from "../components/audit-card";
import { HStack, VStack } from "../components/common/helperdivs";
import { Title } from "../components/common/text";
import CourseAddModal from "../components/course-add-modal";
import { PreferencesProvider, usePreferences } from "../providers/main-page";
import "../styles/content.css";
import MultiDonutGraph, { Bar } from "./components/graph";
import Navbar from "./components/navbar";
import RequirementBreakdown, {
  CATEGORY_COLORS,
} from "./components/requirement-breakdown";

// Context for sharing audit data betw sidebar and main
interface AuditContextType {
  sections: RequirementSection[];
  currentAuditId: string | null;
  setCurrentAuditId: (id: string | null) => void;
  progresses: CurrentAuditProgress;
  completion: number;
}

const AuditContext = createContext<AuditContextType>({
  sections: [],
  currentAuditId: null,
  setCurrentAuditId: () => {},
  progresses: {
    total: { current: 0, total: 0 },
    sections: [],
  },
  completion: 0,
});
const useAuditContext = () => useContext(AuditContext);

const App = () => {
  const [sections, setSections] = useState<RequirementSection[]>([]);
  const [completion, setCompletion] = useState<number>(0);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(
    new URLSearchParams(window.location.search).get("auditId"), // look at broswer
  );

  const progresses = calculateWeightedDegreeCompletion(sections ?? []);

  // Load audit data from cache (scraped upfront when user visits UT Direct)
  React.useEffect(() => {
    if (!currentAuditId) {
      console.log("[Main] No audit ID provided");
      return;
    }

    async function loadAudit() {
      console.log(`[Main] Loading audit data for: ${currentAuditId}`);

      // Get completion from audit history
      const history = await getAuditHistory();
      const matchingAudit = history?.audits.find(
        (a) => a.auditId === currentAuditId,
      );
      if (matchingAudit?.percentage) setCompletion(matchingAudit.percentage);

      // Load requirements from cache
      const cached = await getAuditData(currentAuditId!);
      if (cached) setSections(cached.requirements);
      else console.warn(`[Main] Audit ${currentAuditId} not in cache.`);
    }

    loadAudit();
  }, [currentAuditId]);

  return (
    <PreferencesProvider>
      <AuditContext.Provider
        value={{
          sections,
          currentAuditId,
          setCurrentAuditId,
          progresses,
          completion,
        }}
      >
        <DegreeAuditPage />
      </AuditContext.Provider>
    </PreferencesProvider>
  );
};

const Sidebar = () => {
  const { sidebarIsOpen, toggleSidebar } = usePreferences();
  const { currentAuditId, setCurrentAuditId, progresses } = useAuditContext();
  const [audits, setAudits] = useState<DegreeAuditCardProps[]>([]); //history
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
        "py-5 h-full min-h-screen flex flex-col fixed left-0 top-0 bg-white border-r border-[var(--color-dap-border)] overflow-hidden whitespace-nowrap transition-[width] duration-300 ease-out",
        {
          "w-[375px]": sidebarIsOpen,
          "w-0 pointer-events-none": !sidebarIsOpen,
        },
      )}
      aria-hidden={!sidebarIsOpen}
      {...(!sidebarIsOpen ? { inert: true } : {})}
    >
      {/* Header */}
      <div className="px-8 pb-4 flex items-center justify-between gap-4 w-full">
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
          <SidebarIcon size={24} className="text-[var(--color-dap-dark-alt)]" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8">
        {/* MY AUDITS Section */}
        <div className="flex items-center justify-between">
          <span className="text-[19px] font-bold text-[var(--color-dap-dark-heading)] tracking-[-0.19px]">
            MY AUDITS
          </span>
          <button className="p-1 hover:bg-black/5 rounded">
            <Plus size={24} className="text-[var(--color-dap-dark-alt)]" />
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
        <hr className="my-5 border-[var(--color-dap-border)]" />

        {/* RESOURCES Section */}
        <div className="text-[25px] font-bold text-[var(--color-dap-dark-heading)] tracking-[-0.19px]">
          RESOURCES
        </div>
        <div className="mt-3 flex flex-col gap-2 ">
          <a
            href="#"
            className="text-[var(--color-dap-orange)] text-[15px] font-medium hover:underline flex items-center gap-1"
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
        <hr className="my-5 border-[var(--color-dap-border)]" />

        {/* Feedback Link */}
        <a
          href="#"
          className="text-[var(--color-dap-orange)] font-semibold hover:underline flex items-center gap-1"
        >
          Send us Feedback! <ArrowSquareOut size={14} />
        </a>
      </div>

      {/* Footer */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <img src={lhdLogo} alt="Longhorn Developers" className="w-6 h-6" />
          <div className="text-sm">
            <span className="text-[var(--color-dap-orange)] font-semibold">
              MADE WITH LOVE, BY
            </span>
            <br />
            <span className="text-[var(--color-dap-orange)] font-semibold">
              LONGHORN DEVELOPERS
            </span>
          </div>
        </div>
        <div className="flex items-center justify-start gap-4 text-[var(--color-dap-dark)]">
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
        "ml-[375px]": sidebarIsOpen,
        "ml-0": !sidebarIsOpen,
      })}
    >
      {children}
    </VStack>
  );
};

const DegreeAuditPage = () => {
  const { sections, progresses } = useAuditContext();
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
          {progresses.total.current}/{progresses.total.total} hours completed
          <DegreeCompletionPercentage />
          <Title text="Degree Checklist" />
          {sections.map(
            (section, idx) =>
              progresses.sections[idx]?.progress.total > 0 && (
                <RequirementBreakdown
                  key={section.title || `section-${idx}`}
                  title={section.title}
                  hours={progresses.sections[idx].progress}
                  requirements={section.rules ?? []}
                  onAddCourse={handleOpenModal}
                  colorIndex={idx}
                />
              ),
          )}
        </VStack>
      </MainContent>

      {/* Course Search Modal */}
      <CourseAddModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSearch={(searchData) => {
          console.log("Search data:", searchData);
          // TODO: Implement course search functionality
          handleCloseModal();
        }}
      />
    </HStack>
  );
};

const DegreeCompletionPercentage = () => {
  const { progresses, completion } = useAuditContext();
  const bars = progresses.sections
    .filter((section) => section.progress.total > 0)
    .sort((a, b) => b.progress.total - a.progress.total)
    .map((section, index) => ({
      title: section.title,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length].rgb,
      percentage: section.progress,
    })) satisfies Bar[];

  const overallPercentage = Math.round(completion);

  return (
    <MultiDonutGraph
      bars={bars}
      tooltipContent={(bar) => (
        <VStack
          className="p-2 rounded-md border-2 font-bold bg-gray-200 shadow-md shadow-black/20 w-full"
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
                (bar.percentage.current / bar.percentage.total) * 100,
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
        <div className="text-2xl font-bold">{overallPercentage}%</div>
        <div className="text-lg leading-tight w-min text-center">
          Degree Completion
        </div>
      </VStack>
    </MultiDonutGraph>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
