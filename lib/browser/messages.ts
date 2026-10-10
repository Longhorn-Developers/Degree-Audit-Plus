import type {
  AuditDegree,
  AuditHistoryEntry,
  CachedAuditData,
  CustomAuditRunRequest,
} from "@/domain/audit";
import type { AuditDiff } from "@/domain/audit";
import type {
  CourseCode,
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
  // UI -> background: plan this one course on UT, rerun the open audit's
  // degree with it, and diff the result against that audit.
  | { type: "PREVIEW_COURSE"; course: PlannerSyncTarget; auditId: string }
  // UI -> background: keep the last previewed course and rerun the open
  // audit's degree with it.
  | { type: "ACCEPT_PREVIEW"; auditId: string }
  // UI -> background: tidy up and read the UT planner, with which rows the
  // user already added to their plan.
  | { type: "CHECK_PLANNER" }
  // Background -> UT tab: the tab half of CHECK_PLANNER.
  | { type: "READ_PLANNER" }
  // UI -> background: the planner prompt's answer. Removing a course the open
  // audit counts reruns it.
  | {
      type: "UPDATE_PLANNER";
      keep: PlannerRowKey[];
      remove: PlannerRowKey[];
      auditId: string;
    }
  // UI -> background -> UT tab: the background opens a UT tab and forwards it
  // unchanged; the tab deletes on UT (only it passes UT's CSRF).
  | { type: "DELETE_AUDIT"; auditId: string }
  | { type: "GET_SYNC_STATUS" }
  | { type: "SCRAPE_ALL_AUDITS"; auditIds: string[] }
  | { type: "SCRAPE_ALL_STARTED" }
  | { type: "SCRAPE_ALL_COMPLETE" }
  // Background -> UT tab: fetches and parses one result.
  | { type: "FETCH_AUDIT"; auditId: string }
  // Background -> UT tab: runs one audit end to end (submit, wait, scrape).
  | ({ type: "RUN_AUDIT"; runId: string } & AuditRunRequest)
  // Background -> UT tab: stop waiting on that run (no reply).
  | { type: "CANCEL_RUN"; runId: string }
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

// Reply to a delete, on both hops.
export type ActionResult = { ok: true } | { ok: false; error: string };

// Sent by a content script asked to fetch and parse one audit's results page.
export type FetchAuditResult =
  | { audit: CachedAuditData }
  | { error: "AUTH_REQUIRED" | "SCRAPE_FAILED" };

// What to run: the default degree, a custom one, or `degree` (an earlier
// audit's), with `preview` added to the planned courses.
export interface AuditRunRequest {
  custom?: CustomAuditRunRequest;
  degree?: AuditDegree;
  preview?: PlannerSyncTarget;
  remove?: PlannerRowKey[];
  // an earlier audit to delete on UT once this one is in
  replaces?: string;
}

export interface PlannerCourse {
  row: PlannedCourseRow;
  accepted: boolean;
}

// Everything the tab learned from one run.
export interface AuditRunOutcome {
  auditId: string;
  // the card the run folds into, which keeps its oldest run's id
  cardId: string;
  // UT's percentage for this run, the one the dashboard shows
  percentage: number;
  audit: CachedAuditData;
  history: AuditHistoryEntry[];
  // ms per step, in the order they ran
  steps: Record<string, number>;
}

// The reply to PREVIEW_COURSE: what the course changed against the open audit
// (of `degree`), planned courses that audit is missing or still has but the
// planner doesn't, and how long each step took.
export interface CoursePreview {
  diff: AuditDiff;
  degree: string;
  missingPlanned: CourseCode[];
  removedPlanned: CourseCode[];
  steps: Record<string, number>;
}

export type RunAuditResult =
  | { ok: true; outcome: AuditRunOutcome }
  | { ok: false; error: string };

interface MessageResponses {
  OPEN_DEGREE_AUDIT: { success: true } | { success: false; error: string };
  RUN_NEW_AUDIT:
    | { success: true; auditId: string }
    | { success: false; error: string };
  PREVIEW_COURSE:
    | ({ success: true } & CoursePreview)
    | { success: false; error: string };
  ACCEPT_PREVIEW:
    | { success: true; auditId: string }
    | { success: false; error: string };
  CHECK_PLANNER:
    | { success: true; courses: PlannerCourse[] }
    | { success: false; error: string };
  READ_PLANNER:
    | { ok: true; rows: PlannedCourseRow[] }
    | { ok: false; error: string };
  UPDATE_PLANNER:
    | { success: true; auditId: string | null }
    | { success: false; error: string };
  DELETE_AUDIT: ActionResult;
  GET_SYNC_STATUS: { isSyncing: boolean };
  SCRAPE_ALL_AUDITS: {
    status: "started" | "already-running" | "auth-required" | "no-source-tab";
  };
  FETCH_AUDIT: FetchAuditResult;
  RUN_AUDIT: RunAuditResult;
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
      | "PREVIEW_COURSE"
      | "ACCEPT_PREVIEW"
      | "CHECK_PLANNER"
      | "READ_PLANNER"
      | "UPDATE_PLANNER"
      | "DELETE_AUDIT"
      | "GET_SYNC_STATUS"
      | "SCRAPE_ALL_AUDITS"
      | "FETCH_AUDIT"
      | "RUN_AUDIT"
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

// Settles a delete into the reply sent back on either hop.
export function toActionResult(
  action: Promise<unknown>,
): Promise<ActionResult> {
  return action.then(
    () => ({ ok: true }),
    (error: unknown) => {
      console.error("Failed to delete audit:", error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    },
  );
}
