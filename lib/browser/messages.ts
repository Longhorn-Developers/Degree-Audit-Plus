import type {
  AuditHistoryEntry,
  CachedAuditData,
  CustomAuditRunRequest,
} from "@/domain/audit";
import type {
  PlannedCourseRow,
  PlannerAddLink,
  PlannerCourseRequest,
  PlannerErrorCode,
  PlannerResolution,
  PlannerRowKey,
  PlannerSyncTarget,
} from "@/domain/course";
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
  // Background -> UT tab: fetches the history page with its raw audit ids.
  | { type: "FETCH_AUDIT_HISTORY" }
  // Background -> UT tab: submits the authenticated form.
  | { type: "RUN_AUDIT_VIA_FETCH"; custom?: CustomAuditRunRequest }
  | { type: "PLANNER_READ" }
  | { type: "PLANNER_RESOLVE"; course: PlannerCourseRequest }
  | { type: "PLANNER_ADD"; link: PlannerAddLink }
  | { type: "PLANNER_DELETE"; key: PlannerRowKey }
  | { type: "PLANNER_SYNC"; targets: PlannerSyncTarget[] };

export type PlannerMessage = Extract<
  ExtensionMessage,
  { type: `PLANNER_${string}` }
>;

export interface PlannerData {
  PLANNER_READ: PlannedCourseRow[];
  PLANNER_RESOLVE: PlannerResolution;
  PLANNER_ADD: PlannedCourseRow;
  PLANNER_DELETE: null;
  PLANNER_SYNC: PlannedCourseRow[];
}

// PlannerError doesnt survive messaging so only its code crosses the wire
export type PlannerResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: PlannerErrorCode };

// Sent by a content script asked to fetch and parse one audit's results page.
export type FetchAuditResult =
  | { audit: CachedAuditData }
  | { error: "AUTH_REQUIRED" | "SCRAPE_FAILED" };

// when each step of a background run happened, in epoch ms
export interface AuditRunTiming {
  submittedAt: number;
  detectedAt: number;
  scrapeStartedAt: number;
  scrapeEndedAt: number;
}

// raw ids keep every row, audits is the deduped list the ui shows
export type FetchAuditHistoryResult =
  | { audits: AuditHistoryEntry[]; auditIds: string[] }
  | { error: "AUTH_REQUIRED" | "SCRAPE_FAILED" };

interface MessageResponses {
  OPEN_DEGREE_AUDIT: { success: true } | { success: false; error: string };
  RUN_NEW_AUDIT:
    | { success: true; auditId: string; timing: AuditRunTiming }
    | { success: false; error: string };
  GET_SYNC_STATUS: { isSyncing: boolean };
  SCRAPE_ALL_AUDITS: {
    status: "started" | "already-running" | "auth-required" | "no-source-tab";
  };
  FETCH_AUDIT: FetchAuditResult;
  FETCH_AUDIT_HISTORY: FetchAuditHistoryResult;
  RUN_AUDIT_VIA_FETCH: { ok: true } | { ok: false; error: string };
  PLANNER_READ: PlannerResult<PlannerData["PLANNER_READ"]>;
  PLANNER_RESOLVE: PlannerResult<PlannerData["PLANNER_RESOLVE"]>;
  PLANNER_ADD: PlannerResult<PlannerData["PLANNER_ADD"]>;
  PLANNER_DELETE: PlannerResult<PlannerData["PLANNER_DELETE"]>;
  PLANNER_SYNC: PlannerResult<PlannerData["PLANNER_SYNC"]>;
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
      | "FETCH_AUDIT_HISTORY"
      | "RUN_AUDIT_VIA_FETCH"
      | "PLANNER_READ"
      | "PLANNER_RESOLVE"
      | "PLANNER_ADD"
      | "PLANNER_DELETE"
      | "PLANNER_SYNC";
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
