import type { CachedAuditData } from "../../domain/audit";
import { browser } from "wxt/browser";

export type ExtensionMessage =
  | { type: "TOGGLE_POPUP" }
  | { type: "OPEN_DEGREE_AUDIT"; auditId?: string }
  | { type: "RUN_NEW_AUDIT" }
  | { type: "GET_SYNC_STATUS" }
  | { type: "SCRAPE_ALL_AUDITS"; auditIds: string[] }
  | { type: "SCRAPE_ALL_STARTED" }
  | { type: "SCRAPE_ALL_COMPLETE" }
  | { type: "RUN_SCRAPER"; auditId: string }
  | { type: "AUDIT_RESULTS"; auditId: string; audit: CachedAuditData }
  | {
      type: "AUDIT_SCRAPE_ERROR";
      auditId: string;
      error: "AUTH_REQUIRED" | "TABLE_NOT_FOUND";
    };

interface MessageResponses {
  OPEN_DEGREE_AUDIT: { success: true } | { success: false; error: string };
  RUN_NEW_AUDIT:
    | { success: true; existing: boolean }
    | { success: false; error: string };
  GET_SYNC_STATUS: { isSyncing: boolean };
  SCRAPE_ALL_AUDITS: { status: "started" };
}

type MessageResponse<M extends ExtensionMessage> =
  M["type"] extends keyof MessageResponses ? MessageResponses[M["type"]] : void;

type ResponseRequest = Extract<
  ExtensionMessage,
  {
    type:
      | "OPEN_DEGREE_AUDIT"
      | "RUN_NEW_AUDIT"
      | "GET_SYNC_STATUS"
      | "SCRAPE_ALL_AUDITS";
  }
>;

export function sendRuntimeMessage<M extends ExtensionMessage>(
  message: M,
): Promise<MessageResponse<M>> {
  return browser.runtime.sendMessage(message) as Promise<MessageResponse<M>>;
}

export function sendTabMessage<M extends ExtensionMessage>(
  tabId: number,
  message: M,
): Promise<MessageResponse<M>> {
  return browser.tabs.sendMessage(tabId, message) as Promise<
    MessageResponse<M>
  >;
}

export function sendMessageResponse<M extends ResponseRequest>(
  _request: M,
  sendResponse: (response: MessageResponse<M>) => void,
  response: MessageResponse<M>,
): void {
  sendResponse(response);
}
