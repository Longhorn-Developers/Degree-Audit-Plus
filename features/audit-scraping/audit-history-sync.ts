import type { AuditHistoryEntry } from "@/domain/audit";
import {
  getUncachedAuditIds,
  saveAuditHistory,
} from "@/lib/storage/audit-storage";
import { sendRuntimeMessage } from "@/lib/browser/messages";
import { parseAuditHistory } from "./audit-history-parser";

const AUDIT_HISTORY_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/history/";

export async function isLoggedIn(): Promise<boolean> {
  try {
    const response = await fetch(AUDIT_HISTORY_URL, { credentials: "include" });
    return response.ok && !response.redirected;
  } catch {
    return false;
  }
}

export async function fetchAuditHistory(): Promise<AuditHistoryEntry[]> {
  const response = await fetch(AUDIT_HISTORY_URL, { credentials: "include" });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  return parseAuditHistory(
    new DOMParser().parseFromString(await response.text(), "text/html"),
  );
}

async function fetchAndSaveAuditHistory(): Promise<AuditHistoryEntry[]> {
  const audits = await fetchAuditHistory();
  await saveAuditHistory(audits);
  return audits;
}

async function refreshAuditHistory(): Promise<void> {
  const audits = await fetchAndSaveAuditHistory();

  const auditIds = audits
    .map(({ auditId }) => auditId)
    .filter((auditId): auditId is string => Boolean(auditId));
  const uncachedIds = await getUncachedAuditIds(auditIds);
  if (uncachedIds.length) {
    await sendRuntimeMessage({
      type: "SCRAPE_ALL_AUDITS",
      auditIds: uncachedIds,
    });
  }
}

function observeHistoryTable(document: Document): void {
  let observerActive = false;

  const attach = () => {
    if (observerActive) return;

    const historyTable = Array.from(document.querySelectorAll("table")).find(
      (table) =>
        /Degree Audits Requested|Request Created|Audit Type/.test(
          table.textContent ?? "",
        ),
    );
    const tbody = historyTable?.querySelector("tbody");
    if (!tbody) return;

    observerActive = true;
    let lastRowCount = tbody.querySelectorAll("tr").length;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    new MutationObserver(() => {
      const currentRowCount = tbody.querySelectorAll("tr").length;
      if (currentRowCount <= lastRowCount) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          await fetchAndSaveAuditHistory();
          lastRowCount = currentRowCount;
        } catch (error) {
          console.error("Error refreshing audit history:", error);
        }
      }, 2_000);
    }).observe(tbody, { childList: true });
  };

  attach();
  setTimeout(attach, 3_000);
}

export async function startAuditHistorySync(document: Document): Promise<void> {
  try {
    await refreshAuditHistory();
    observeHistoryTable(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching audit history:", error);
    await saveAuditHistory([], message);
  }
}
