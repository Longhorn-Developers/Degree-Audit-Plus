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
  type FetchAuditHistoryResult,
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

function registerAuditNavigationHandlers(): void {
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

export interface AuditRunDependencies {
  getAuditPageTab: () => Promise<{ tabId: number; created: boolean }>;
  fetchHistory: (tabId: number) => Promise<FetchAuditHistoryResult | undefined>;
  submit: (
    tabId: number,
    custom?: CustomAuditRunRequest,
  ) => Promise<{ ok: true } | { ok: false; error: string } | undefined>;
  scrapeAudit: (auditId: string, tabId: number) => Promise<CachedAuditData>;
  saveHistory: (audits: AuditHistoryEntry[]) => Promise<void>;
  saveAudit: (auditId: string, audit: CachedAuditData) => Promise<void>;
  closeTab: (tabId: number) => Promise<void>;
  pollIntervalMs?: number;
  pollWindowMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// runs audits one at a time. snapshot the raw history ids, submit, poll until
// a new id shows up, scrape it. a tab we opened stays open until all of that is done
export function createAuditRunner(deps: AuditRunDependencies) {
  const pollIntervalMs = deps.pollIntervalMs ?? 500;
  const pollWindowMs = deps.pollWindowMs ?? 90_000;

  // the last run in line, the next one waits for it
  let lastRun: Promise<unknown> = Promise.resolve();

  async function fetchHistory(tabId: number) {
    const history = await deps.fetchHistory(tabId);
    if (!history) throw new Error("No response from audit page");
    if ("error" in history) throw new Error(history.error);
    return history;
  }

  async function submitAudit(tabId: number, custom?: CustomAuditRunRequest) {
    const result = await deps.submit(tabId, custom);
    if (!result) throw new Error("No response from audit page");
    if (!result.ok) throw new Error(result.error);
  }

  // polls history until an id we didnt see before submit shows up
  async function waitForNewAudit(tabId: number, knownIds: string[]) {
    const deadline = Date.now() + pollWindowMs;
    while (Date.now() < deadline) {
      const history = await fetchHistory(tabId);
      for (const auditId of history.auditIds) {
        if (!knownIds.includes(auditId)) {
          return { auditId, audits: history.audits };
        }
      }
      await sleep(pollIntervalMs);
    }
    throw new Error("RUN_TIMEOUT");
  }

  async function runOne(
    custom?: CustomAuditRunRequest,
  ): Promise<AuditRunResult> {
    const { tabId, created } = await deps.getAuditPageTab();
    try {
      const before = await fetchHistory(tabId);

      await submitAudit(tabId, custom);
      const submittedAt = Date.now();

      const found = await waitForNewAudit(tabId, before.auditIds);
      const detectedAt = Date.now();
      await deps.saveHistory(found.audits);

      const scrapeStartedAt = Date.now();
      const audit = await deps.scrapeAudit(found.auditId, tabId);
      await deps.saveAudit(found.auditId, audit);
      const scrapeEndedAt = Date.now();

      return {
        auditId: found.auditId,
        timing: { submittedAt, detectedAt, scrapeStartedAt, scrapeEndedAt },
      };
    } finally {
      if (created) {
        try {
          await deps.closeTab(tabId);
        } catch {
          // already closed
        }
      }
    }
  }

  return function runAudit(custom?: CustomAuditRunRequest) {
    const run = lastRun.then(() => runOne(custom));
    lastRun = run.catch(() => {});
    return run;
  };
}

const runQueuedAudit = createAuditRunner({
  getAuditPageTab,
  fetchHistory: (tabId) =>
    sendTabMessageWhenReady(tabId, { type: "FETCH_AUDIT_HISTORY" }),
  submit: (tabId, custom) =>
    sendTabMessageWhenReady(tabId, { type: "RUN_AUDIT_VIA_FETCH", custom }),
  scrapeAudit: scrapeAuditInTab,
  saveHistory: saveAuditHistory,
  saveAudit: saveAuditData,
  closeTab: (tabId) => browser.tabs.remove(tabId),
});

const TIMING_LOG_KEY = "auditRunTimings";
const TIMING_LOG_SIZE = 20;

// keeps the last few runs in storage so other tickets can read the numbers
async function recordRunTiming(result: AuditRunResult): Promise<void> {
  const timing = result.timing;
  const generateMs = timing.detectedAt - timing.submittedAt;
  const scrapeMs = timing.scrapeEndedAt - timing.scrapeStartedAt;
  console.log(
    `Audit ${result.auditId}: generate ${generateMs} ms, scrape ${scrapeMs} ms`,
  );

  const stored = await browser.storage.local.get(TIMING_LOG_KEY);
  let log: AuditRunResult[] = [];
  if (Array.isArray(stored[TIMING_LOG_KEY])) {
    log = stored[TIMING_LOG_KEY] as AuditRunResult[];
  }
  log.push(result);
  if (log.length > TIMING_LOG_SIZE) {
    log = log.slice(log.length - TIMING_LOG_SIZE);
  }
  await browser.storage.local.set({ [TIMING_LOG_KEY]: log });
}

async function runNewAudit(
  custom?: CustomAuditRunRequest,
): Promise<AuditRunResult> {
  // Catch a known-dead session up front — the run itself re-checks via its
  // own responses, so the instant cached read is enough here.
  if ((await getCachedLoginState()) === false) {
    await openLoginTab();
    throw new Error("Not logged in to UT Direct");
  }

  try {
    const result = await runQueuedAudit(custom);
    await recordRunTiming(result);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      await openLoginTab();
    }
    throw error;
  }
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
  registerAuditNavigationHandlers();
  registerAuditScrapingHandlers();
  registerSessionCookieWatcher();
  registerPlannerBridge({
    getAuditPageTab,
    sendToTab: sendTabMessageWhenReady,
    closeTab: (tabId) => browser.tabs.remove(tabId),
  });
}
