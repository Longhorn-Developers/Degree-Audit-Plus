import type { CachedAuditData, CustomAuditRunRequest } from "@/domain/audit";
import { browser } from "wxt/browser";

export type ExtensionMessage =
  | { type: "OPEN_DEGREE_AUDIT"; auditId?: string }
  // UI -> background -> UT tab: the background opens a UT tab and forwards
  // these unchanged; the tab submits UT's form (only it passes UT's CSRF).
  | { type: "RUN_NEW_AUDIT"; custom?: CustomAuditRunRequest }
  | { type: "DELETE_AUDIT"; auditId: string }
  | { type: "GET_SYNC_STATUS" }
  | { type: "SCRAPE_ALL_AUDITS"; auditIds: string[] }
  | { type: "SCRAPE_ALL_STARTED" }
  | { type: "SCRAPE_ALL_COMPLETE" }
  // Background -> UT tab: fetches and parses one result.
  | { type: "FETCH_AUDIT"; auditId: string };

// Reply to a run or delete, on both hops.
export type ActionResult = { ok: true } | { ok: false; error: string };

// Sent by a content script asked to fetch and parse one audit's results page.
export type FetchAuditResult =
  | { audit: CachedAuditData }
  | { error: "AUTH_REQUIRED" | "SCRAPE_FAILED" };

interface MessageResponses {
  OPEN_DEGREE_AUDIT: { success: true } | { success: false; error: string };
  RUN_NEW_AUDIT: ActionResult;
  DELETE_AUDIT: ActionResult;
  GET_SYNC_STATUS: { isSyncing: boolean };
  SCRAPE_ALL_AUDITS: {
    status: "started" | "already-running" | "auth-required" | "no-source-tab";
  };
  FETCH_AUDIT: FetchAuditResult;
}

type MessageResponse<M extends ExtensionMessage> =
  M["type"] extends keyof MessageResponses ? MessageResponses[M["type"]] : void;

type ResponseRequest = Extract<
  ExtensionMessage,
  {
    type:
      | "OPEN_DEGREE_AUDIT"
      | "RUN_NEW_AUDIT"
      | "DELETE_AUDIT"
      | "GET_SYNC_STATUS"
      | "SCRAPE_ALL_AUDITS"
      | "FETCH_AUDIT";
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

/**
 * Subscribes to runtime messages with the typed `ExtensionMessage` union.
 * Returns an unsubscribe function.
 */
export function onExtensionMessage(
  listener: (message: ExtensionMessage) => void,
): () => void {
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}

/**
 * Purely a type-narrowing shim: links a request's `type` to its response
 * shape so background handlers can't reply with the wrong payload.
 */
export function sendMessageResponse<M extends ResponseRequest>(
  _request: M,
  sendResponse: (response: MessageResponse<M>) => void,
  response: MessageResponse<M>,
): void {
  sendResponse(response);
}

// Settles a run or delete into the reply sent back on either hop.
export function toActionResult(
  action: Promise<unknown>,
): Promise<ActionResult> {
  return action.then(
    () => ({ ok: true }),
    (error: unknown) => {
      console.error("Audit action failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    },
  );
}
