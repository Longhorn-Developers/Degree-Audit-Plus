import {
  sendRuntimeMessage,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import { checkLoginRequired, parseAuditPage } from "./audit-page-parser";
import { startAuditHistorySync } from "./audit-history-sync";
import { recordLoginStateFromPage } from "./login-state";

export function startAuditContentController(document: Document): void {
  recordLoginStateFromPage(document);

  if (/^\/apps\/degree\/audits\/?$/.test(document.location.pathname)) {
    void startAuditHistorySync(document);
  }

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type !== "RUN_SCRAPER") return;

    if (checkLoginRequired(document)) {
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
