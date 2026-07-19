import {
  sendRuntimeMessage,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import {
  isLoginPage,
  recordLoginStateFromPage,
} from "@/features/session/session";
import { parseAuditPage } from "./audit-page-parser";
import {
  resumePendingAuditPoll,
  startAuditHistorySync,
  watchForAuditRunClicks,
} from "./audit-history-sync";

// look at /audits and /submissions/history -> for when to scrape
const SYNC_PAGE_PATTERNS = [
  /^\/apps\/degree\/audits\/?$/,
  /^\/apps\/degree\/audits\/(?:submissions|requests)\/history\/?$/,
];

// The page audits are run from; a pending run's poll resumes here on reload.
const RUN_PAGE_PATTERN =
  /^\/apps\/degree\/audits\/submissions\/student_individual\/?$/;

export function startAuditContentController(document: Document): void {
  recordLoginStateFromPage(document);
  watchForAuditRunClicks(document);

  const pathname = document.location.pathname;
  if (SYNC_PAGE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    void startAuditHistorySync(document);
  } else if (RUN_PAGE_PATTERN.test(pathname)) {
    void resumePendingAuditPoll();
  }

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type !== "RUN_SCRAPER") return;

    if (isLoginPage(document)) {
      void sendRuntimeMessage({
        type: "AUDIT_SCRAPE_ERROR",
        auditId: message.auditId,
        error: "AUTH_REQUIRED",
      });
      return;
    }

    if (!document.querySelector("#coursework table.results")) {
      void sendRuntimeMessage({
        type: "AUDIT_SCRAPE_ERROR",
        auditId: message.auditId,
        error: "TABLE_NOT_FOUND",
      });
      return;
    }

    try {
      void sendRuntimeMessage({
        type: "AUDIT_RESULTS",
        auditId: message.auditId,
        audit: parseAuditPage(document),
      });
    } catch (error) {
      console.error("Failed to parse audit page:", error);
      void sendRuntimeMessage({
        type: "AUDIT_SCRAPE_ERROR",
        auditId: message.auditId,
        error: "PARSE_ERROR",
      });
    }
  });
}
