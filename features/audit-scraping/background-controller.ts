import type { CachedAuditData } from "@/domain/audit";
import { saveAuditData } from "@/lib/storage/audit-storage";
import {
  sendMessageResponse,
  sendRuntimeMessage,
  sendTabMessage,
  type ExtensionMessage,
} from "@/lib/browser/messages";
import {
  closeScraperTab,
  closeScraperWindow,
  createScraperTab,
} from "./scraper-window";

type ScrapeFailure = Extract<
  ExtensionMessage,
  { type: "AUDIT_SCRAPE_ERROR" }
>["error"];

interface PendingScrape {
  resolve: () => void;
  reject: (error: Error) => void;
}

export interface AuditBatchResult {
  succeeded: string[];
  failed: string[];
}

export interface AuditBatchDependencies {
  startScrape: (auditId: string) => Promise<void>;
  saveAudit: (auditId: string, audit: CachedAuditData) => Promise<void>;
  closeTab: (tabId: number) => Promise<void>;
  closeWindow: () => Promise<void>;
  broadcast: (state: "started" | "complete") => Promise<void>;
  delay?: (milliseconds: number) => Promise<void>;
  scrapeTimeoutMs?: number;
  requestDelayMs?: number;
}

export class AuditBatchController {
  private readonly pending = new Map<string, PendingScrape>();
  private activeBatch: Promise<AuditBatchResult> | null = null;

  constructor(private readonly dependencies: AuditBatchDependencies) {}

  get isSyncing(): boolean {
    return this.activeBatch !== null;
  }

  start(auditIds: string[]): boolean {
    if (this.activeBatch) return false;

    const batch = this.run(auditIds);
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

  async receiveResult(
    auditId: string,
    audit: CachedAuditData,
    tabId?: number,
  ): Promise<void> {
    try {
      await this.dependencies.saveAudit(auditId, audit);
      this.pending.get(auditId)?.resolve();
    } catch (error) {
      this.pending
        .get(auditId)
        ?.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (tabId !== undefined) await this.dependencies.closeTab(tabId);
    }
  }

  receiveFailure(
    auditId: string,
    failure: ScrapeFailure,
    tabId?: number,
  ): void {
    if (tabId !== undefined) void this.dependencies.closeTab(tabId);
    this.pending.get(auditId)?.reject(new Error(failure));
  }

  private async run(auditIds: string[]): Promise<AuditBatchResult> {
    const result: AuditBatchResult = { succeeded: [], failed: [] };
    await this.dependencies.broadcast("started");

    try {
      for (const auditId of auditIds) {
        try {
          await this.scrape(auditId);
          result.succeeded.push(auditId);
        } catch {
          result.failed.push(auditId);
        }

        await (this.dependencies.delay ?? defaultDelay)(
          this.dependencies.requestDelayMs ?? 150,
        );
      }
    } finally {
      await this.dependencies.closeWindow();
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

  private scrape(auditId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Scrape timeout")),
        this.dependencies.scrapeTimeoutMs ?? 35_000,
      );
      const finish = (callback: () => void) => {
        clearTimeout(timeout);
        callback();
      };

      this.pending.set(auditId, {
        resolve: () => finish(resolve),
        reject: (error) => finish(() => reject(error)),
      });
      void this.dependencies
        .startScrape(auditId)
        .catch((error) =>
          this.pending
            .get(auditId)
            ?.reject(error instanceof Error ? error : new Error(String(error))),
        );
    }).finally(() => this.pending.delete(auditId));
  }
}

function defaultDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

async function startScrape(auditId: string): Promise<void> {
  await createScraperTab({
    url: `https://utdirect.utexas.edu/apps/degree/audits/results/${auditId}/`,
    mode: "background",
    timeout: 30_000,
    messageOnLoad: { type: "RUN_SCRAPER", auditId },
  });
}

const batchController = new AuditBatchController({
  startScrape,
  saveAudit: saveAuditData,
  closeTab: closeScraperTab,
  closeWindow: closeScraperWindow,
  broadcast: broadcastSyncState,
});

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
        if (!batchController.start(message.auditIds)) {
          console.warn(
            "SCRAPE_ALL_AUDITS ignored: an audit batch is already running",
          );
        }
        sendMessageResponse(message, sendResponse, { status: "started" });
        return true;
      }

      if (message.type === "AUDIT_RESULTS") {
        void batchController.receiveResult(
          message.auditId,
          message.audit,
          sender.tab?.id,
        );
        return false;
      }

      if (message.type === "AUDIT_SCRAPE_ERROR") {
        batchController.receiveFailure(
          message.auditId,
          message.error,
          sender.tab?.id,
        );
        return false;
      }
    },
  );
}

const NEW_AUDIT_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

function clickRunAuditButton(retry = false): void {
  const click = () => {
    const button = document.querySelector<HTMLButtonElement>(".run_button");
    button?.click();
    return Boolean(button);
  };

  if (click() || !retry) return;
  let attempts = 0;
  const timer = setInterval(() => {
    if (click() || ++attempts >= 120) clearInterval(timer);
  }, 500);
}

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
        void runNewAudit().then(
          (existing) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              existing,
            }),
          (error) =>
            sendMessageResponse(message, sendResponse, {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }),
        );
        return true;
      }
    },
  );
}

async function runNewAudit(): Promise<boolean> {
  const tabs = await browser.tabs.query({ url: "*://utdirect.utexas.edu/*" });
  const existingTab = tabs.find((tab) => tab.url?.startsWith(NEW_AUDIT_URL));
  if (existingTab?.id !== undefined) {
    await browser.scripting.executeScript({
      target: { tabId: existingTab.id },
      func: clickRunAuditButton,
    });
    return true;
  }

  const tab = await browser.tabs.create({ url: NEW_AUDIT_URL, active: false });
  if (tab.id === undefined) throw new Error("Failed to open audit page");

  const listener = async (
    tabId: number,
    changeInfo: Browser.tabs.OnUpdatedInfo,
  ) => {
    if (tabId !== tab.id || changeInfo.status !== "complete") return;

    browser.tabs.onUpdated.removeListener(listener);
    await browser.scripting.executeScript({
      target: { tabId },
      func: clickRunAuditButton,
      args: [true],
    });
    setTimeout(() => void browser.tabs.remove(tabId).catch(() => {}), 30_000);
  };
  browser.tabs.onUpdated.addListener(listener);
  return false;
}

export function registerAuditBackgroundController(): void {
  registerAuditNavigationHandlers();
  registerAuditScrapingHandlers();
}
