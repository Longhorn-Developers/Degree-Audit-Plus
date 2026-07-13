import {
  sendRuntimeMessage,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import { checkLoginRequired, parseAuditPage } from "./audit-page-parser";
import { startAuditHistorySync } from "./audit-history-sync";

export function startAuditContentController(document: Document): void {
  void startAuditHistorySync(document);

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

    void sendRuntimeMessage({
      type: "AUDIT_RESULTS",
      auditId: message.auditId,
      audit: parseAuditPage(document),
    });
  });
}
