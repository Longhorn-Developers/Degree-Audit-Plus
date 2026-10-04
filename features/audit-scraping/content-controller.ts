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
import { deleteAudit, runAudit } from "./audit-runner";

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

      // the tab hop of a run or delete forwarded by the background
      if (message.type === "RUN_NEW_AUDIT" || message.type === "DELETE_AUDIT") {
        const action =
          message.type === "RUN_NEW_AUDIT"
            ? runAudit(message.custom)
            : deleteAudit(message.auditId);
        void toActionResult(action).then((result) =>
          sendMessageResponse(message, sendResponse, result),
        );
        return true;
      }
    },
  );
}
