import type { CachedAuditData, CustomAuditRunRequest } from "@/domain/audit";
import { saveAuditData } from "@/features/audit/audit-storage";
import {
  sendMessageResponse,
  sendRuntimeMessage,
  sendTabMessage,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import {
  getCachedLoginState,
  openLoginTab,
  registerSessionCookieWatcher,
} from "@/features/session/session";

export interface AuditBatchResult {
  succeeded: string[];
  failed: string[];
}

export interface AuditBatchDependencies {
  // Fetches and parses one audit inside the content script of `tabId`.
  scrapeAudit: (auditId: string, tabId: number) => Promise<CachedAuditData>;
  saveAudit: (auditId: string, audit: CachedAuditData) => Promise<void>;
  broadcast: (state: "started" | "complete") => Promise<void>;
  delay?: (milliseconds: number) => Promise<void>;
  scrapeTimeoutMs?: number;
  requestDelayMs?: number;
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

    try {
      for (const [index, auditId] of auditIds.entries()) {
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
            result.failed.push(...auditIds.slice(index + 1));
            break;
          }
        }

        if (index < auditIds.length - 1) {
          const delayMs = this.dependencies.requestDelayMs ?? 150;
          if (this.dependencies.delay) {
            await this.dependencies.delay(delayMs);
          } else {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
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
          (existing) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              existing,
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

// Submits the run through a content script on a UT audits page — the only
// context whose origin passes UT's CSRF checks. Returns whether an existing
// tab was used.
async function runNewAudit(custom?: CustomAuditRunRequest): Promise<boolean> {
  // Catch a known-dead session up front — the run itself re-checks via its
  // own responses, so the instant cached read is enough here.
  if ((await getCachedLoginState()) === false) {
    await openLoginTab();
    throw new Error("Not logged in to UT Direct");
  }

  const { tabId, created } = await getAuditPageTab();
  let submitted = false;
  try {
    const result = await sendRunRequest(tabId, custom);
    if (!result.ok) {
      if (result.error === "AUTH_REQUIRED") await openLoginTab();
      throw new Error(result.error);
    }
    submitted = true;
    return !created;
  } finally {
    // After a submission the created tab hosts the poll that picks up the
    // finished audit — give it time to complete. A failed run has nothing to
    // wait for.
    if (created) {
      setTimeout(
        () => void browser.tabs.remove(tabId).catch(() => {}),
        submitted ? 30_000 : 0,
      );
    }
  }
}

// Any open audits page can host the run; otherwise open one in the background.
async function getAuditPageTab(): Promise<{ tabId: number; created: boolean }> {
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
async function sendRunRequest(tabId: number, custom?: CustomAuditRunRequest) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      return await sendTabMessage(tabId, {
        type: "RUN_AUDIT_VIA_FETCH",
        custom,
      });
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
}
