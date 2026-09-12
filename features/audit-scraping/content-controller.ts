import {
  sendMessageResponse,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import { recordLoginStateFromPage } from "@/features/session/session";
import {
  fetchAuditResults,
  resumePendingAuditPoll,
  startAuditHistorySync,
  watchForAuditRunClicks,
} from "./audit-history-sync";
import { runAudit } from "./audit-runner";
import {
  addPlannedCourse,
  deletePlannedCourse,
  readPlanner,
} from "./planner-client";

// look at /audits and /submissions/history -> for when to scrape
const SYNC_PAGE_PATTERNS = [
  /^\/apps\/degree\/audits\/?$/,
  /^\/apps\/degree\/audits\/(?:submissions|requests)\/history\/?$/,
];

// The page audits are run from; a pending run's poll resumes here on reload.
const RUN_PAGE_PATTERN =
  /^\/apps\/degree\/audits\/(?:submissions|requests)\/student_individual\/?$/;

export function startAuditContentController(document: Document): void {
  recordLoginStateFromPage(document);
  exposePlannerDevHandle();
  watchForAuditRunClicks(document);

  const pathname = document.location.pathname;
  if (SYNC_PAGE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    void startAuditHistorySync(document);
  } else if (RUN_PAGE_PATTERN.test(pathname)) {
    void resumePendingAuditPoll();
  }

  // The background delegates fetches and run submissions here: this page's
  // origin carries the UT session (and passes CSRF), and the service worker
  // has no DOMParser of its own.
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === "FETCH_AUDIT") {
        void fetchAuditResults(message.auditId).then((result) =>
          sendMessageResponse(message, sendResponse, result),
        );
        return true;
      }

      if (
        message.type === "PLANNER_READ" ||
        message.type === "PLANNER_ADD" ||
        message.type === "PLANNER_DELETE"
      ) {
        void handlePlannerMessage(message).then((result) =>
          sendMessageResponse(message, sendResponse, result),
        );
        return true;
      }

      if (message.type === "RUN_AUDIT_VIA_FETCH") {
        void runAudit(message.custom).then(
          () => sendMessageResponse(message, sendResponse, { ok: true }),
          (error) => {
            console.error("Failed to run audit:", error);
            sendMessageResponse(message, sendResponse, {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            });
          },
        );
        return true;
      }
    },
  );
}

/**
 * Planner reads and writes run here rather than in the service worker: this
 * page is same-origin with UT (so the session cookie rides along and the
 * Referer check passes) and it has a DOMParser, which MV3 workers do not.
 */
async function handlePlannerMessage(
  message: Extract<
    ExtensionMessage,
    { type: "PLANNER_READ" | "PLANNER_ADD" | "PLANNER_DELETE" }
  >,
) {
  try {
    if (message.type === "PLANNER_READ") {
      return { ok: true as const, data: await readPlanner() };
    }
    if (message.type === "PLANNER_ADD") {
      return {
        ok: true as const,
        data: await addPlannedCourse(message.course),
      };
    }
    return { ok: true as const, data: await deletePlannedCourse(message.row) };
  } catch (error) {
    console.error(`${message.type} failed:`, error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Dev-only manual test handle for the planner client. Lets a UT audits page's
 * console drive the *extension's* code path (content script, bundled module)
 * rather than a pasted spike script, which is the thing DAP-117 needs to
 * confirm. Stripped from production builds.
 */
function exposePlannerDevHandle(): void {
  if (!import.meta.env.DEV) return;
  Object.assign(window as unknown as Record<string, unknown>, {
    dapPlanner: { readPlanner, addPlannedCourse, deletePlannedCourse },
  });
  console.log(
    "[dap] planner dev handle ready: " +
      'await dapPlanner.addPlannedCourse({ dept: "C S", num: "331", ccyys: "20272" })',
  );
}
