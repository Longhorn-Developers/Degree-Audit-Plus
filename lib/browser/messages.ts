import type { CachedAuditData, CustomAuditRunRequest } from "@/domain/audit";
import { browser } from "wxt/browser";

export type ExtensionMessage =
  | { type: "OPEN_DEGREE_AUDIT"; auditId?: string }
  // UI -> background: orchestrates an audit submission.
  | { type: "RUN_NEW_AUDIT"; custom?: CustomAuditRunRequest }
  | { type: "GET_SYNC_STATUS" }
  | { type: "SCRAPE_ALL_AUDITS"; auditIds: string[] }
  | { type: "SCRAPE_ALL_STARTED" }
  | { type: "SCRAPE_ALL_COMPLETE" }
  // Background -> UT tab: fetches and parses one result.
  | { type: "FETCH_AUDIT"; auditId: string }
  // Background -> UT tab: submits the authenticated form.
  | { type: "RUN_AUDIT_VIA_FETCH"; custom?: CustomAuditRunRequest }
  // UI/background -> UT tab: reads or mutates the UT course planner.
  | { type: "PLANNER_READ" }
  | { type: "PLANNER_ADD"; course: PlannerCourseRef }
  | { type: "PLANNER_DELETE"; row: PlannerRowPayload }
  // UI -> background: same three operations, routed to a UT tab for the UI.
  | { type: "PLANNER_READ_VIA_BG" }
  | { type: "PLANNER_ADD_VIA_BG"; course: PlannerCourseRef }
  | { type: "PLANNER_DELETE_VIA_BG"; row: PlannerRowPayload };

export interface PlannerCourseRef {
  dept: string;
  num: string;
  ccyys: string;
}

// Structural copy of features/audit-scraping/planner-client.ts PlannerRow, kept
// here so the message union doesn't drag a feature module into every importer.
export interface PlannerRowPayload {
  keyCourseId: string;
  keyCourseCcyys: string | null;
  keyCourseSeq: string | null;
  expired: boolean;
  rowText: string;
}

export type PlannerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Sent by a content script asked to fetch and parse one audit's results page.
export type FetchAuditResult =
  | { audit: CachedAuditData }
  | { error: "AUTH_REQUIRED" | "SCRAPE_FAILED" };

interface MessageResponses {
  OPEN_DEGREE_AUDIT: { success: true } | { success: false; error: string };
  RUN_NEW_AUDIT:
    | { success: true; existing: boolean }
    | { success: false; error: string };
  GET_SYNC_STATUS: { isSyncing: boolean };
  SCRAPE_ALL_AUDITS: {
    status: "started" | "already-running" | "auth-required" | "no-source-tab";
  };
  FETCH_AUDIT: FetchAuditResult;
  RUN_AUDIT_VIA_FETCH: { ok: true } | { ok: false; error: string };
  PLANNER_READ: PlannerResult<PlannerRowPayload[]>;
  PLANNER_ADD: PlannerResult<{
    row: PlannerRowPayload;
    candidateCount: number;
    elapsedMs: number;
  }>;
  PLANNER_DELETE: PlannerResult<{
    removed: number;
    targetGone: boolean;
    elapsedMs: number;
  }>;
  PLANNER_READ_VIA_BG: PlannerResult<PlannerRowPayload[]>;
  PLANNER_ADD_VIA_BG: PlannerResult<{
    row: PlannerRowPayload;
    candidateCount: number;
    elapsedMs: number;
  }>;
  PLANNER_DELETE_VIA_BG: PlannerResult<{
    removed: number;
    targetGone: boolean;
    elapsedMs: number;
  }>;
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
      | "SCRAPE_ALL_AUDITS"
      | "FETCH_AUDIT"
      | "RUN_AUDIT_VIA_FETCH"
      | "PLANNER_READ"
      | "PLANNER_ADD"
      | "PLANNER_DELETE"
      | "PLANNER_READ_VIA_BG"
      | "PLANNER_ADD_VIA_BG"
      | "PLANNER_DELETE_VIA_BG";
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
