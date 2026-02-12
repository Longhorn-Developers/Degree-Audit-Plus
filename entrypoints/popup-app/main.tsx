import React from "react";
import ReactDOM from "react-dom/client";
import { browser } from "wxt/browser";
import Button from "../components/common/button";
import { DegreeAuditCardPopup } from "../components/audit-card";
import "./style.css";
import DAPLogo from "@/assets/svgs/dap-circle-logo";
import logo from "../../public/logo.png";
import { PlusIcon } from "@phosphor-icons/react";
import { getAuditHistory } from "@/lib/storage";
import type { DegreeAuditCardProps } from "@/lib/general-types";
import { SpinnerIcon } from "@phosphor-icons/react";
// import HypotheticalCourseModal, {
//   type HypotheticalCourse,
// } from "../components/hypothetical-course-modal";

export default function App() {
  const [audits, setAudits] = React.useState<DegreeAuditCardProps[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const [runningAudit, setRunningAudit] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  // const [isAuthenticated, setIsAuthenticated] = React.useState(true);
  // const [isModalOpen, setIsModalOpen] = React.useState(false);
  // const [hypotheticalCourses, setHypotheticalCourses] = React.useState<
  //   HypotheticalCourse[]
  // >([]);
  // Load audit history from cached storage
  // Storage is updated ONLY when user visits UT Direct audits home page
  // This allows popup to work from any page using cached data
  React.useEffect(() => {
    async function loadAudits() {
      try {
        console.log("Popup: Loading audit history from cached storage...");
        const data = await getAuditHistory();
        console.log("Popup: Storage data:", data);

        if (data) {
          if (data.error) {
            console.error("Popup: Stored error:", data.error);
            setError(data.error);
            setAudits([]);
          } else {
            console.log("Popup: Loaded audits from cache:", data.audits);
            setAudits(data.audits);
            setError(null);
          }
        } else {
          console.log("Popup: No audit history in cache go to the ");
        }
      } catch (e) {
        console.error("Error loading audit history:", e);
        setError("Failed to load audit history");
      } finally {
        setLoading(false);
      }
    }

    loadAudits();
  }, []);

  React.useEffect(() => {
    // get sycn status for ui
    browser.runtime
      .sendMessage({ type: "GET_SYNC_STATUS" })
      .then((response) => {
        if (response?.isSyncing) {
          setIsSyncing(true);
        }
      })
      .catch(() => {});

    const listener = (message: any) => {
      if (message.type === "SCRAPE_ALL_STARTED") {
        setIsSyncing(true);
      }
      if (message.type === "SCRAPE_ALL_COMPLETE") {
        setIsSyncing(false);
      }
    };

    // Listen for storage changes to detect when audit completes and reload data
    const storageListener = async (changes: { [key: string]: any }) => {
      if (changes.auditHistory) {
        console.log("Popup: Audit history updated, reloading...");
        setRunningAudit(false);
        try {
          const data = await getAuditHistory();
          if (data) {
            if (data.error) {
              setError(data.error);
              setAudits([]);
            } else {
              setAudits(data.audits);
              setError(null);
            }
          }
        } catch (e) {
          console.error("Error reloading audit history:", e);
        }
      }
    };

    browser.runtime.onMessage.addListener(listener);
    browser.storage.onChanged.addListener(storageListener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
      browser.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const handleOpenDegreeAuditPage = (auditId: string | undefined) => {
    browser.runtime.sendMessage({
      action: "openDegreeAudit",
      auditId: auditId,
    });
  };

  // Send message to background script to run audit (background has access to tabs/scripting APIs)
  const handleRerunAudit = async () => {
    console.log("Popup: Rerun audit button clicked");
    setRunningAudit(true);
    browser.runtime.sendMessage({ type: "RUN_NEW_AUDIT" });
  };

  // Determine which audits to display
  const displayedAudits = showAll ? audits : audits.slice(0, 3);
  const hasMoreAudits = audits.length > 3;

  // const handleAddHypotheticalCourse = (course: HypotheticalCourse) => {
  //   console.log("Adding hypothetical course:", course);
  //   setHypotheticalCourses((prev) => [...prev, course]);
  //   // TODO: Store in browser storage and send to degree audit page
  // };
  const Pill = ({ text }: { text: string }) => (
    <span className="inline-flex items-center rounded-full bg-[var(--color-dap-primary)] px-2.5 py-[2px] text-[12px] font-extrabold leading-none text-white">
      {text}
    </span>
  );

  const AuditCardDetailed = ({ audit }: { audit: DegreeAuditCardProps }) => (
    <div
      className="
          group
          w-full
          rounded-[12px]
          border
          border-gray-200
          bg-white
          px-5
          py-4
          hover:cursor-pointer
          hover:bg-[var(--color-dap-primary)]
          transition-colors
        "
      onClick={(e) => {
        e.stopPropagation();
        handleOpenDegreeAuditPage(audit?.auditId);
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div
            className="
              text-[20px]
              font-extrabold
              text-[var(--color-dap-primary)]
              leading-tight
              transition-colors
              group-hover:text-white
            "
          >
            {audit.title}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span
              className="
              text-[13px]
              font-medium
              tracking-wide
              text-black
              transition-colors
              hover:text-white
            "
            >
              MAJOR
            </span>

            {(audit.majors ?? []).map((m, i) => (
              <span
                key={`${m}-${i}`}
                className="
                  inline-flex items-center
                  rounded-[6px]
                  bg-[#068b5e]
                  px-3 py-[3px]
                  text-[12px]
                  leading-none
                  text-white
                "
              >
                {m}
              </span>
            ))}
          </div>

          {/* Optional MINOR/CERT row if you want parity with the detailed card */}
          {(audit.minors ?? []).length > 0 && (
            <div className="mt-2 flex items-center gap-4">
              <div className="text-[13px] font-extrabold tracking-wide text-[var(--color-ut-charcoal)]">
                MINOR/CERT
              </div>
              <div className="flex flex-wrap gap-2">
                {(audit.minors ?? []).map((m, i) => (
                  <span
                    key={`${m}-${i}`}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-[2px] text-[12px] font-bold leading-none text-[var(--color-ut-charcoal)]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right badge */}
        <div className="relative top-6">
          <div className="rounded-[10px] bg-[var(--color-dap-primary)] px-3.5 py-2 text-white text-[16px] font-extrabold leading-none">
            {audit.percentage}%
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-[438px] h-full min-h-[300px] max-h-[600px] bg-white font-sans overflow-hidden flex flex-col border border-gray-100">
      <header className="flex justify-between items-center p-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <img
            src={logo}
            alt="Logo"
            style={{ width: "70px", height: "auto" }}
          />
          <span className="font-bold text-lg text-dap-primary leading-tight">
            Degree Audit
            <br />
            Plus
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <Button className="rounded-md" onClick={handleRerunAudit}>
            {runningAudit ? (
              <div className="flex items-center space-x-2">
                <SpinnerIcon size={24} className="animate-spin-slow" />
                <p className="text-lg font-bold">Running Audit...</p>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <PlusIcon size={24} />
                <p className="text-lg font-bold">Run New Audit</p>
              </div>
            )}
          </Button>
        </div>
      </header>

      <main className="p-5 pt-4 overflow-y-auto flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1
              style={{ fontFamily: "Roboto Flex" }}
              className="text-[25.63px] font-bold text-[var(--color-dap-dark)]"
            >
              {audits.length} AUDITS
            </h1>
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-[var(--color-dap-gray-light)]">
                <SpinnerIcon size={14} className="animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}
          </div>
          {/* <Button
            size="small"
            color="orange"
            fill="outline"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <PlusIcon size={16} />
            <span className="text-sm">Hypothetical</span>
          </Button> */}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
            <p className="text-base text-[var(--color-dap-gray-light)]">
              Loading audit history...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
            <p className="text-base text-red-600 max-w-[250px]">
              Error loading audits: {error}
            </p>
            <p className="text-sm text-[var(--color-dap-gray-light)]">
              Please visit the UT Direct degree audits page to refresh.
            </p>
          </div>
        ) : audits.length === 0 ? (
          <div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
            <p className="text-base text-[var(--color-dap-gray-light)] tracking-[0.32px] max-w-[250px]">
              Alas! Your future is veiled. I do not know what is to come.
            </p>
            <p className="text-[14.22px] font-medium text-[var(--color-ut-charcoal)]">
              (No current audits)
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              {displayedAudits.map((audit, index) => (
                <div
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDegreeAuditPage(audit?.auditId);
                  }}
                >
                  <DegreeAuditCardPopup
                    title={audit.title}
                    majors={audit.majors}
                    minors={audit.minors}
                    percentage={audit.percentage}
                  />
                </div>
              ))}
            </div>
            {hasMoreAudits && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-[var(--color-dap-link)] font-medium text-sm mb-1 hover:underline hover:cursor-pointer"
              >
                {showAll ? "Show Less" : `Show ${audits.length - 3} More`}
              </button>
            )}
          </>
        )}
      </main>

      {/* Hypothetical Course Modal */}
      {/* <HypotheticalCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddHypotheticalCourse}
      /> */}
    </div>
  );
}

// Only render if we're in the standalone popup context (not injected via content script)
const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
