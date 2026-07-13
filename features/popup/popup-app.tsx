import {
  getAuditHistory,
  watchAuditHistory,
} from "@/lib/storage/audit-storage";
import type { AuditHistoryData, AuditHistoryEntry } from "@/domain/audit";
import {
  sendRuntimeMessage,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import { PlusIcon, SpinnerIcon } from "@phosphor-icons/react";
import React, { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import Button from "@/components/ui/button";
import logo from "@/public/logo.png";
import PopupAuditCard from "./popup-audit-card";

export default function App() {
  const [audits, setAudits] = useState<AuditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const applyAuditHistory = useCallback((data: AuditHistoryData | null) => {
    if (data?.error) {
      setError(data.error);
      setAudits([]);
      return;
    }
    setAudits(data?.audits ?? []);
    setError(null);
  }, []);

  // Load audit history from cached storage
  // Storage is updated ONLY when user visits UT Direct audits home page
  // This allows popup to work from any page using cached data
  const refreshAudits = useCallback(async () => {
    try {
      applyAuditHistory(await getAuditHistory());
    } catch (e) {
      console.error("Error loading audit history:", e);
      setError("Failed to load audit history");
    }
  }, [applyAuditHistory]);

  useEffect(() => {
    refreshAudits().finally(() => setLoading(false));
  }, [refreshAudits]);

  useEffect(() => {
    // get sycn status for ui
    sendRuntimeMessage({ type: "GET_SYNC_STATUS" })
      .then((response) => {
        if (response?.isSyncing) {
          setIsSyncing(true);
        }
      })
      .catch(() => {});

    const listener = (message: ExtensionMessage) => {
      if (message.type === "SCRAPE_ALL_STARTED") {
        setIsSyncing(true);
      }
      if (message.type === "SCRAPE_ALL_COMPLETE") {
        setIsSyncing(false);
      }
    };

    const unwatchAuditHistory = watchAuditHistory((data) => {
      setRunningAudit(false);
      applyAuditHistory(data);
    });

    browser.runtime.onMessage.addListener(listener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
      unwatchAuditHistory();
    };
  }, [applyAuditHistory]);

  const handleOpenDegreeAuditPage = (auditId: string | undefined) => {
    sendRuntimeMessage({
      type: "OPEN_DEGREE_AUDIT",
      auditId,
    });
  };

  // Send message to background script to run audit (background has access to tabs/scripting APIs)
  const handleRerunAudit = async () => {
    setRunningAudit(true);
    sendRuntimeMessage({ type: "RUN_NEW_AUDIT" });
  };

  // Determine which audits to display
  const displayedAudits = showAll ? audits : audits.slice(0, 3);
  const hasMoreAudits = audits.length > 3;

  return (
    <div className="w-[438px] h-full min-h-[300px] max-h-[600px] bg-background font-sans overflow-hidden flex flex-col border border-gray-100">
      <header className="flex justify-between items-center px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <img
            src={logo}
            alt="Logo"
            style={{ width: "40px", height: "auto" }}
          />
          <span className="font-semibold text-[16px] text-dap-primary leading-none font-header-title">
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
              className="text-[25.63px] font-bold text-dap-dark"
            >
              {audits.length} AUDITS
            </h1>
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-dap-gray-light">
                <SpinnerIcon size={14} className="animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
            <p className="text-base text-dap-gray-light">
              Loading audit history...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
            <p className="text-base text-red-600 max-w-[250px]">
              Error loading audits: {error}
            </p>
            <p className="text-sm text-dap-gray-light">
              Please visit the UT Direct degree audits page to refresh.
            </p>
          </div>
        ) : audits.length === 0 ? (
          <div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
            <p className="text-base text-dap-gray-light tracking-[0.32px] max-w-[250px]">
              Alas! Your future is veiled. I do not know what is to come.
            </p>
            <p className="text-[14.22px] font-medium text-dap-dark">
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
                  <PopupAuditCard
                    title={audit.title}
                    percentage={audit.percentage}
                  />
                </div>
              ))}
            </div>
            {hasMoreAudits && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-dap-link font-medium text-sm mb-1 hover:underline hover:cursor-pointer"
              >
                {showAll ? "Show Less" : `Show ${audits.length - 3} More`}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
