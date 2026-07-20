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
