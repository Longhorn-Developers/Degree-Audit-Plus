import {
  sendMessageResponse,
  toActionResult,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import { recordLoginStateFromPage } from "@/features/session/session";
import {
  fetchAuditResults,
  resumePendingAuditPoll,
  startAuditHistorySync,
  watchForAuditRunClicks,
} from "./audit-history-sync";
import {
  cancelRun,
  deleteAudit,
  promotePreview,
  readPlanner,
  runAudit,
} from "./audit-runner";
import { handlePlannerMessage, isPlannerMessage } from "./planner-bridge";

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
  watchForAuditRunClicks(document);

  const pathname = document.location.pathname;
  if (SYNC_PAGE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    void startAuditHistorySync(document);
  } else if (RUN_PAGE_PATTERN.test(pathname)) {
    void resumePendingAuditPoll();
  }

  // The background delegates fetches, run submissions, and deletes here: this page's
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

      if (message.type === "CANCEL_RUN") {
        cancelRun(message.runId);
        return;
      }

      if (message.type === "RUN_AUDIT") {
        void runAudit(message.runId, message).then(
          (outcome) =>
            sendMessageResponse(message, sendResponse, { ok: true, outcome }),
          (error: unknown) => {
            const reason =
              error instanceof Error ? error.message : String(error);
            if (reason === "CANCELLED") {
              console.log(
                `Audit run ${message.runId} cancelled by a newer request`,
              );
            } else {
              console.error("Failed to run audit:", error);
            }
            sendMessageResponse(message, sendResponse, {
              ok: false,
              error: reason,
            });
          },
        );
        return true;
      }

      // the tab hop of a delete forwarded by the background
      if (message.type === "DELETE_AUDIT") {
        void toActionResult(deleteAudit(message.auditId)).then((result) =>
          sendMessageResponse(message, sendResponse, result),
        );
        return true;
      }

      if (message.type === "READ_PLANNER") {
        void readPlanner().then(
          (rows) =>
            sendMessageResponse(message, sendResponse, { ok: true, rows }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            }),
        );
        return true;
      }

      if (message.type === "PROMOTE_PREVIEW") {
        void promotePreview(message.auditId, message.replaces).then(
          (promoted) =>
            sendMessageResponse(message, sendResponse, {
              ok: true,
              ...promoted,
            }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            }),
        );
        return true;
      }

      if (isPlannerMessage(message)) {
        void handlePlannerMessage(message).then((result) =>
          sendMessageResponse(message, sendResponse, result),
        );
        return true;
      }
    },
  );
}
