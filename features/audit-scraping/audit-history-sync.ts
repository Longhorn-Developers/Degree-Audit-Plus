// Syncs the extension's audit cache with UT's audit history page.
import { hasAuditResult, type AuditHistoryEntry } from "@/domain/audit";
import {
  getUncachedAuditIds,
  saveAuditHistory,
} from "@/features/audit/audit-storage";
import { fetchUtPage } from "@/features/session/session";
import {
  sendRuntimeMessage,
  type FetchAuditResult,
} from "@/lib/browser/messages";
import { storage } from "wxt/utils/storage";
import { parseAuditHistory } from "./audit-history-parser";
import { parseAuditPage } from "./audit-page-parser";

export const AUDIT_HISTORY_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/history/";
const AUDIT_RESULTS_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/results/";

// UT's markup for the button that submits a new audit request. The background
// controller clicks it programmatically, so detecting and clicking must agree.
export const RUN_AUDIT_BUTTON_SELECTOR = ".run_button";

const POLL_INTERVAL_MS = 500;
const POLL_WINDOW_MS = 90_000;

// Timestamp of a run-audit click whose result hasn't been picked up yet.
const createPendingRunItem = () =>
  storage.defineItem<number | null>("local:pendingAuditRunAt", {
    defaultValue: null,
  });
let pendingRunItem: ReturnType<typeof createPendingRunItem> | undefined;

function getPendingRunItem() {
  // Avoid touching extension storage when consumers only import this module.
  return (pendingRunItem ??= createPendingRunItem());
}

export async function fetchAuditHistory(): Promise<AuditHistoryEntry[]> {
  const { page } = await fetchUtPage(AUDIT_HISTORY_URL);
  return parseAuditHistory(page);
}

// Fetch and parse one audit's results page. Runs in a content script on a UT
// page: same-origin, so the session cookies ride along and DOMParser exists.
// Never throws — failures collapse into the typed result the background expects.
export async function fetchAuditResults(
  auditId: string,
): Promise<FetchAuditResult> {
  try {
    const { page } = await fetchUtPage(`${AUDIT_RESULTS_URL}${auditId}/`);
    return { audit: parseAuditPage(page) };
  } catch (error) {
    console.error(`Failed to fetch audit ${auditId}:`, error);
    const loggedOut =
      error instanceof Error && error.message === "AUTH_REQUIRED";
    return { error: loggedOut ? "AUTH_REQUIRED" : "SCRAPE_FAILED" };
  }
}

// One sync pass: pull the history page, persist it, and dispatch scraping for
// any audits not yet cached. Returns whether anything was dispatched.
async function refreshAuditHistory(): Promise<boolean> {
  return processAuditHistory(await fetchAuditHistory());
}

// Only finished audits are stored, so no UI shows a run until it's scraped
// and deduped. Pending rows still reach the caller's polling via `audits`.
export async function processAuditHistory(
  audits: AuditHistoryEntry[],
): Promise<boolean> {
  const finished = audits.filter(hasAuditResult);
  const auditIds = finished.map((audit) => audit.auditId);
  const [, uncachedIds] = await Promise.all([
    saveAuditHistory(finished),
    getUncachedAuditIds(auditIds),
  ]);
  if (!uncachedIds.length) return false;

  await sendRuntimeMessage({
    type: "SCRAPE_ALL_AUDITS",
    auditIds: uncachedIds,
  });
  return true;
}

let activePoll: Promise<void> | null = null;

// Poll until the requested audit lands.
function pollForRequestedAudit(startedAt: number): Promise<void> {
  return (activePoll ??= (async () => {
    let lastSeen: string | undefined;
    let sawPending = false;
    const tick = async (): Promise<boolean> => {
      // Another audits page may have picked up the run and finished first.
      if ((await getPendingRunItem().getValue()) === null) return true;

      const audits = await fetchAuditHistory();
      // Skip storage writes (and their watcher fan-out into live UI) while
      // UT still serves the same history as the previous tick.
      const snapshot = JSON.stringify(audits);
      if (snapshot === lastSeen) return false;

      lastSeen = snapshot;
      // a duplicate rerun folds into its card with nothing new to scrape, so
      // the run is also done once its pending row has come and gone
      const pending = audits.some((audit) => !hasAuditResult(audit));
      sawPending ||= pending;
      const dispatched = await processAuditHistory(audits);
      return dispatched || (sawPending && !pending);
    };

    try {
      const deadline = startedAt + POLL_WINDOW_MS;
      while (Date.now() < deadline) {
        if (await tick()) break;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error("Error polling for a requested audit:", error);
    } finally {
      await getPendingRunItem().removeValue();
      activePoll = null;
    }
  })());
}

// Marks a run as pending and polls for its result. The marker survives page
// navigation; resumePendingAuditPoll picks it up on the next audits page.
export async function markAuditRunPending(): Promise<void> {
  const startedAt = Date.now();
  await getPendingRunItem().setValue(startedAt);
  void pollForRequestedAudit(startedAt);
}

// Marks a run as pending when UT's run button is clicked, then polls for it.
export function watchForAuditRunClicks(document: Document): void {
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(RUN_AUDIT_BUTTON_SELECTOR)) return;
      void markAuditRunPending();
    },
    { capture: true },
  );
}

// Resumes polling for a marked-but-unretrieved.
export async function resumePendingAuditPoll(): Promise<boolean> {
  const startedAt = await getPendingRunItem().getValue();
  if (startedAt === null) return false;

  if (Date.now() - startedAt >= POLL_WINDOW_MS) {
    await getPendingRunItem().removeValue();
    return false;
  }
  void pollForRequestedAudit(startedAt);
  return true;
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
          await refreshAuditHistory();
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
    if (!(await resumePendingAuditPoll())) {
      const audits = await fetchAuditHistory();
      await processAuditHistory(audits);
      // Poll for a completing audit even though we never saw the run happen —
      // custom audits are submitted from pages the click watcher doesn't
      // cover. Signals: UT's post-submit redirect (?submit_success=Y), or a
      // history entry without a result link (an audit still generating).
      const justSubmitted =
        new URLSearchParams(document.location.search).get("submit_success") ===
        "Y";
      if (justSubmitted || audits.some((audit) => !hasAuditResult(audit))) {
        await markAuditRunPending();
      }
    }
    observeHistoryTable(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching audit history:", error);
    await saveAuditHistory([], message);
  }
}
