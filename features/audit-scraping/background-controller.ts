import type {
  AuditHistoryEntry,
  CachedAuditData,
  CustomAuditRunRequest,
} from "@/domain/audit";
import {
  saveAuditData,
  saveAuditHistory,
} from "@/features/audit/audit-storage";
import {
  sendMessageResponse,
  sendRuntimeMessage,
  sendTabMessage,
  type AuditRunTiming,
  type ExtensionMessage,
  type RunAuditResult,
} from "@/lib/browser/messages";
import {
  getCachedLoginState,
  openLoginTab,
  registerSessionCookieWatcher,
} from "@/features/session/session";
import { registerPlannerBridge } from "./planner-bridge";

export interface AuditBatchResult {
  succeeded: string[];
  failed: string[];
}

export interface AuditBatchDependencies {
  // Fetches and parses one audit inside the content script of `tabId`.
  scrapeAudit: (auditId: string, tabId: number) => Promise<CachedAuditData>;
  saveAudit: (auditId: string, audit: CachedAuditData) => Promise<void>;
  broadcast: (state: "started" | "complete") => Promise<void>;
  scrapeTimeoutMs?: number;
  concurrency?: number;
}

export class AuditBatchController {
  private activeBatch: Promise<AuditBatchResult> | null = null;

  constructor(private readonly dependencies: AuditBatchDependencies) {}

  get isSyncing(): boolean {
    return this.activeBatch !== null;
  }

  start(auditIds: string[], tabId: number): boolean {
    if (this.activeBatch) return false;

    const batch = this.run(auditIds, tabId);
    this.activeBatch = batch;
    void batch.then(
      () => (this.activeBatch = null),
      () => (this.activeBatch = null),
    );
    return true;
  }

  waitForIdle(): Promise<AuditBatchResult | undefined> {
    return this.activeBatch ?? Promise.resolve(undefined);
  }

  private async run(
    auditIds: string[],
    tabId: number,
  ): Promise<AuditBatchResult> {
    const result: AuditBatchResult = { succeeded: [], failed: [] };
    await this.dependencies.broadcast("started");

    // A few plain page fetches in flight at once — fewer than a normal page
    // load opens against one host — keeps the "Syncing" window short.
    const queue = [...auditIds];
    let aborted = false;

    const worker = async (): Promise<void> => {
      for (
        let auditId = queue.shift();
        auditId !== undefined && !aborted;
        auditId = queue.shift()
      ) {
        try {
          const audit = await this.scrapeWithTimeout(auditId, tabId);
          await this.dependencies.saveAudit(auditId, audit);
          result.succeeded.push(auditId);
        } catch (error) {
          console.error(`Failed to scrape audit ${auditId}:`, error);
          result.failed.push(auditId);
          // A dead session fails every remaining audit the same way; stop
          // instead of hammering the login redirect.
          if (error instanceof Error && error.message === "AUTH_REQUIRED") {
            aborted = true;
            result.failed.push(...queue.splice(0));
          }
        }
      }
    };

    try {
      await Promise.all(
        Array.from(
          {
            length: Math.min(
              this.dependencies.concurrency ?? 3,
              auditIds.length,
            ),
          },
          () => worker(),
        ),
      );
    } finally {
      await this.dependencies.broadcast("complete");
      const summary = `Audit batch complete: ${result.succeeded.length} succeeded, ${result.failed.length} failed`;
      if (result.failed.length) {
        console.warn(summary, result);
      } else if (import.meta.env.DEV) {
        console.log(summary, result);
      }
    }

    return result;
  }

  private async scrapeWithTimeout(
    auditId: string,
    tabId: number,
  ): Promise<CachedAuditData> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Scrape timeout")),
        this.dependencies.scrapeTimeoutMs ?? 30_000,
      );
    });

    try {
      return await Promise.race([
        this.dependencies.scrapeAudit(auditId, tabId),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}

async function broadcastSyncState(state: "started" | "complete") {
  const message = {
    type: state === "started" ? "SCRAPE_ALL_STARTED" : "SCRAPE_ALL_COMPLETE",
  } as const;
  const tabs = await browser.tabs.query({});
  await Promise.allSettled([
    ...tabs.flatMap((tab) =>
      tab.id === undefined ? [] : [sendTabMessage(tab.id, message)],
    ),
    sendRuntimeMessage(message),
  ]);
}

// Delegates the fetch+parse to the content script that requested the sync —
// it runs on a UT page, so it has the session cookies and a DOMParser.
async function scrapeAuditInTab(
  auditId: string,
  tabId: number,
): Promise<CachedAuditData> {
  const result = await sendTabMessage(tabId, { type: "FETCH_AUDIT", auditId });
  if (!result) throw new Error("No response from audit page");
  if ("error" in result) throw new Error(result.error);
  return result.audit;
}

const batchController = new AuditBatchController({
  scrapeAudit: scrapeAuditInTab,
  saveAudit: saveAuditData,
  broadcast: broadcastSyncState,
});

async function startAuditBatch(
  auditIds: string[],
  tabId: number | undefined,
): Promise<"started" | "already-running" | "auth-required" | "no-source-tab"> {
  if (tabId === undefined) return "no-source-tab";

  // Catch a known-dead session up front and send the user to log in. The
  // cached read is instant; a stale cache still fails fast via the fetches'
  // own AUTH_REQUIRED handling.
  if ((await getCachedLoginState()) === false) {
    await openLoginTab();
    return "auth-required";
  }

  return batchController.start(auditIds, tabId) ? "started" : "already-running";
}

export function registerAuditScrapingHandlers(): void {
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse) => {
      if (message.type === "GET_SYNC_STATUS") {
        sendMessageResponse(message, sendResponse, {
          isSyncing: batchController.isSyncing,
        });
        return true;
      }

      if (message.type === "SCRAPE_ALL_AUDITS") {
        void startAuditBatch(message.auditIds, sender.tab?.id).then(
          (status) => {
            if (status !== "started") {
              console.warn(`SCRAPE_ALL_AUDITS not started: ${status}`);
            }
            sendMessageResponse(message, sendResponse, { status });
          },
        );
        return true;
      }
    },
  );
}

const NEW_AUDIT_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

function registerAuditNavigationHandlers(
  runNewAudit: (custom?: CustomAuditRunRequest) => Promise<AuditRunResult>,
): void {
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === "OPEN_DEGREE_AUDIT") {
        const url = browser.runtime.getURL(
          `/degree-audit.html?auditId=${message.auditId}`,
        );
        browser.tabs
          .create({ url })
          .then(() =>
            sendMessageResponse(message, sendResponse, { success: true }),
          )
          .catch((error) =>
            sendMessageResponse(message, sendResponse, {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        return true;
      }

      if (message.type === "RUN_NEW_AUDIT") {
        void runNewAudit(message.custom).then(
          (result) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              auditId: result.auditId,
              timing: result.timing,
            }),
          (error) => {
            console.error("Failed to run audit:", error);
            sendMessageResponse(message, sendResponse, {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          },
        );
        return true;
      }
    },
  );
}

export interface AuditRunResult {
  auditId: string;
  timing: AuditRunTiming;
}

export interface RunNewAuditDependencies {
  isLoggedIn: () => Promise<boolean | null>;
  openLoginTab: () => Promise<void>;
  getAuditPageTab: () => Promise<{ tabId: number; created: boolean }>;
  runInTab: (
    tabId: number,
    runId: string,
    custom?: CustomAuditRunRequest,
  ) => Promise<RunAuditResult | undefined>;
  cancelInTab: (tabId: number, runId: string) => Promise<void>;
  saveHistory: (audits: AuditHistoryEntry[]) => Promise<void>;
  saveAudit: (auditId: string, audit: CachedAuditData) => Promise<void>;
  closeTab: (tabId: number) => Promise<void>;
  recordTiming: (result: AuditRunResult) => Promise<void>;
  // Backstop above the tab's own 90 s window, for a tab that never answers.
  runTimeoutMs?: number;
}

// The background's side of a run: cancel the run in flight, gate on login,
// get a UT tab, let the tab do the run, save what came back, close a tab we
// opened. A run superseded while waiting throws CANCELLED.
export function createRunNewAudit(deps: RunNewAuditDependencies) {
  const runTimeoutMs = deps.runTimeoutMs ?? 120_000;
  const runLatest = createLatestOnly();

  return function runNewAudit(
    custom?: CustomAuditRunRequest,
  ): Promise<AuditRunResult> {
    return runLatest(async (signal) => {
      // Superseded before it started: never touch a tab.
      if (signal.aborted) throw new Error("CANCELLED");
      // Catch a known-dead session up front — the run itself re-checks via
      // its own responses, so the instant cached read is enough here.
      if ((await deps.isLoggedIn()) === false) {
        await deps.openLoginTab();
        throw new Error("AUTH_REQUIRED");
      }

      const { tabId, created } = await deps.getAuditPageTab();
      const runId = crypto.randomUUID();
      // The tab checks for the cancel between steps and replies CANCELLED.
      const onAbort = () =>
        void deps.cancelInTab(tabId, runId).catch(() => undefined);
      signal.addEventListener("abort", onAbort);
      if (signal.aborted) onAbort();
      const stopPing = keepAlive();
      try {
        const result = await withTimeout(
          deps.runInTab(tabId, runId, custom),
          runTimeoutMs,
          "RUN_TIMEOUT",
        );
        if (!result) throw new Error("No response from audit page");
        if (!result.ok) throw new Error(result.error);

        const { outcome } = result;
        await deps.saveHistory(outcome.history);
        await deps.saveAudit(outcome.auditId, outcome.audit);
        const summary = { auditId: outcome.auditId, timing: outcome.timing };
        await deps.recordTiming(summary).catch((error: unknown) => {
          console.warn("Failed to record audit run timing:", error);
        });
        return summary;
      } catch (error) {
        if (error instanceof Error && error.message === "AUTH_REQUIRED") {
          await deps.openLoginTab();
        }
        throw error;
      } finally {
        signal.removeEventListener("abort", onAbort);
        stopPing();
        if (created) await deps.closeTab(tabId).catch(() => undefined);
      }
    });
  };
}

// Only the newest request matters. Each call aborts the previous job's signal,
// waits for it to settle, then starts the new one:
//   run(A) → A starts now
//   run(B) → A's signal aborts; B starts once A has settled
function createLatestOnly() {
  let last: Promise<unknown> = Promise.resolve();
  let current: AbortController | undefined;
  return <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    current?.abort();
    const controller = new AbortController();
    current = controller;
    const turn = last
      .catch(() => undefined)
      .then(() => work(controller.signal));
    last = turn;
    return turn;
  };
}

// Chrome retires an idle service worker after 30 s. While the tab does a run
// that can outlast that, a cheap API call every 20 s counts as activity.
function keepAlive(): () => void {
  const timer = setInterval(
    () => void browser.runtime.getPlatformInfo(),
    20_000,
  );
  return () => clearInterval(timer);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const TIMING_LOG_KEY = "auditRunTimings";
const TIMING_LOG_SIZE = 20;

// Keeps the last few runs in storage so other tickets can read the numbers.
async function recordRunTiming(result: AuditRunResult): Promise<void> {
  const stored = await browser.storage.local.get(TIMING_LOG_KEY);
  const previous = Array.isArray(stored[TIMING_LOG_KEY])
    ? (stored[TIMING_LOG_KEY] as AuditRunResult[])
    : [];
  const log = [...previous, result].slice(-TIMING_LOG_SIZE);
  await browser.storage.local.set({ [TIMING_LOG_KEY]: log });
}

// Any open audits page can host the run; otherwise open one in the background.
export async function getAuditPageTab(): Promise<{
  tabId: number;
  created: boolean;
}> {
  const tabs = await browser.tabs.query({
    url: "*://utdirect.utexas.edu/apps/degree/audits/*",
  });
  const existing = tabs.find((tab) => tab.id !== undefined);
  if (existing?.id !== undefined) return { tabId: existing.id, created: false };

  const tab = await browser.tabs.create({ url: NEW_AUDIT_URL, active: false });
  if (tab.id === undefined) throw new Error("Failed to open audit page");
  return { tabId: tab.id, created: true };
}

// A created tab's content script needs a moment to register; retry until it
// answers instead of waiting out the page's full load event.
export async function sendTabMessageWhenReady<M extends ExtensionMessage>(
  tabId: number,
  message: M,
): ReturnType<typeof sendTabMessage<M>> {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      return await sendTabMessage(tabId, message);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Audit page did not respond");
}

export function registerAuditBackgroundController(): void {
  const closeTab = (tabId: number) => browser.tabs.remove(tabId);

  const runNewAudit = createRunNewAudit({
    isLoggedIn: getCachedLoginState,
    openLoginTab,
    getAuditPageTab,
    runInTab: (tabId, runId, custom) =>
      sendTabMessageWhenReady(tabId, { type: "RUN_AUDIT", runId, custom }),
    cancelInTab: (tabId, runId) =>
      sendTabMessage(tabId, { type: "CANCEL_RUN", runId }),
    saveHistory: saveAuditHistory,
    saveAudit: saveAuditData,
    closeTab,
    recordTiming: recordRunTiming,
  });

  registerAuditNavigationHandlers(runNewAudit);
  registerAuditScrapingHandlers();
  registerSessionCookieWatcher();
  registerPlannerBridge({
    getAuditPageTab,
    sendToTab: sendTabMessageWhenReady,
    closeTab,
  });
}
