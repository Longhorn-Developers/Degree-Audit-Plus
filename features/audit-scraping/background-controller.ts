import {
  hasAuditResult,
  type AuditHistoryEntry,
  type CachedAuditData,
} from "@/domain/audit";
import {
  isRowFor,
  plannerCourseIdToCode,
  type PlannerRowKey,
  type PlannerSyncTarget,
} from "@/domain/course";
import {
  acceptPendingPreview,
  getAuditData,
  getAuditHistory,
  getPlanAudit,
  hasUserEdits,
  saveAuditData,
  saveAuditHistory,
  savePlanAudit,
  syncAcceptedCourses,
  updateAcceptedCourses,
} from "@/features/audit/audit-storage";
import {
  diffAudits,
  findMissingPlannedCourses,
  hasPlannedCourse,
} from "@/features/audit/audit-calculations";
import {
  sendMessageResponse,
  sendRuntimeMessage,
  sendTabMessage,
  toActionResult,
  type AuditRunOutcome,
  type AuditRunRequest,
  type CoursePreview,
  type ExtensionMessage,
  type PlannerCourse,
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

// ------------------------------------------------------ running an audit

const NEW_AUDIT_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

// Runs an audit and returns the card to show it on. A rerun that folds into an
// older card is saved under that card's id, so the card shows the new results.
async function runNewAudit(
  request: AuditRunRequest = {},
): Promise<{ auditId: string; cardId: string }> {
  const { auditId, cardId, audit, history } = await queueRun(request);
  // only finished audits are stored, so other runs still pending stay hidden
  await saveAuditHistory(history.filter(hasAuditResult));
  await saveAuditData(cardId, audit);
  return { auditId, cardId };
}

// Add to plan and Remove rerun a degree. Each degree keeps only the latest of
// these: the one before is deleted on UT, unless the user renamed or pinned it.
async function rerunForPlan(request: AuditRunRequest): Promise<string> {
  const degree = request.degree
    ? `${request.degree.degreePlan}|${request.degree.catalogYear}`
    : "default";
  const previous = await getPlanAudit(degree);
  const keepPrevious = !previous || (await hasUserEdits(previous));
  const { auditId, cardId } = await runNewAudit({
    ...request,
    replaces: keepPrevious ? undefined : previous,
  });
  await savePlanAudit(degree, auditId);
  return cardId;
}

// Plans one course on UT, reruns the open audit's degree with it, and diffs
// that against the open audit.
async function previewCourse(
  course: PlannerSyncTarget,
  mainAuditId: string,
): Promise<CoursePreview> {
  const startedAt = Date.now();
  const name = `${course.department} ${course.number}`;
  const card = await findAuditCard(mainAuditId);
  if (!card?.degree) throw new Error("NOT_PREVIEWABLE");
  const main = await getAuditData(mainAuditId);
  if (!main) throw new Error("MAIN_AUDIT_NOT_FOUND");

  console.log(`Preview ${name}: planning it and running an audit`);
  const { auditId, audit, percentage, steps } = await queueRun({
    preview: course,
    degree: card.degree,
  });

  // UT's percentages, same as the dashboard shows
  const diff = {
    progress: { before: card.percentage ?? 0, after: percentage },
    rules: diffAudits(main, audit),
  };
  const missingPlanned = findMissingPlannedCourses(main, audit, name);
  const removedPlanned = findMissingPlannedCourses(audit, main, name);

  // total minus the tab's steps = waiting for the tab and the message trip
  steps.total = Date.now() - startedAt;
  console.log(`Preview ${name}: audit ${auditId}`, diff, steps);
  return {
    diff,
    degree: card.majors?.join("; ") ?? "",
    missingPlanned,
    removedPlanned,
    steps,
  };
}

async function findAuditCard(
  auditId: string,
): Promise<AuditHistoryEntry | undefined> {
  const history = await getAuditHistory();
  return history?.audits.find((card) => card.auditId === auditId);
}

async function acceptPreview(mainAuditId: string): Promise<string> {
  const accepted = await acceptPendingPreview();
  if (!accepted) throw new Error("NO_PREVIEW");
  const card = await findAuditCard(mainAuditId);
  return rerunForPlan({ degree: card?.degree });
}

// It runs on its own when the dashboard opens, so it never opens a login tab.
async function checkPlanner(): Promise<PlannerCourse[]> {
  const rows = await queue(async () => {
    if ((await getCachedLoginState()) === false) {
      throw new Error("AUTH_REQUIRED");
    }
    const { tabId, created } = await getAuditPageTab();
    try {
      const result = await sendTabMessageWhenReady(tabId, {
        type: "READ_PLANNER",
      });
      if (!result) throw new Error("No response from audit page");
      if (!result.ok) throw new Error(result.error);
      return result.rows;
    } finally {
      if (created) await browser.tabs.remove(tabId).catch(() => undefined);
    }
  });

  const accepted = await syncAcceptedCourses(rows);
  return rows.map((row) => ({
    row,
    accepted: accepted.some((course) => isRowFor(row.key, course.course)),
  }));
}

async function updatePlanner(
  keep: PlannerRowKey[],
  remove: PlannerRowKey[],
  mainAuditId: string,
): Promise<string | null> {
  // the kept list only changes once UT has the change too
  if (remove.length === 0) {
    await updateAcceptedCourses(keep, remove);
    return null;
  }

  // the open audit doesn't count these, so rerunning it would change nothing
  const main = await getAuditData(mainAuditId);
  const codes = remove.map((key) => plannerCourseIdToCode(key.courseId));
  if (!main || !hasPlannedCourse(main, codes)) {
    await queue(() => deletePlannerRows(remove));
    await updateAcceptedCourses(keep, remove);
    return null;
  }

  const card = await findAuditCard(mainAuditId);
  const auditId = await rerunForPlan({ remove, degree: card?.degree });
  await updateAcceptedCourses(keep, remove);
  return auditId;
}

async function deletePlannerRows(keys: PlannerRowKey[]): Promise<void> {
  await failIfLoggedOut();
  const { tabId, created } = await getAuditPageTab();
  try {
    for (const key of keys) {
      const result = await sendTabMessageWhenReady(tabId, {
        type: "PLANNER_DELETE",
        key,
      });
      if (!result) throw new Error("No response from audit page");
      if (!result.ok && result.code !== "ROW_NOT_FOUND") {
        throw new Error(result.code);
      }
    }
  } finally {
    if (created) await browser.tabs.remove(tabId).catch(() => undefined);
  }
}

// Requests run one at a time so two runs never share the UT tab. Any newer
// request cancels a preview in flight; a real run always finishes.
let preview: AbortController | undefined;
let last: Promise<unknown> = Promise.resolve();

function queueRun(request: AuditRunRequest): Promise<AuditRunOutcome> {
  preview?.abort();
  const controller = new AbortController();
  preview = request.preview ? controller : undefined;
  return queue(() => runInUtTab(controller.signal, request));
}

function queue<T>(work: () => Promise<T>): Promise<T> {
  const turn = last.catch(() => undefined).then(work);
  last = turn;
  return turn;
}

// One run: gate on login, get a UT tab, let the tab do the run, close a tab
// we opened.
async function runInUtTab(
  signal: AbortSignal,
  request: AuditRunRequest,
): Promise<AuditRunOutcome> {
  if (signal.aborted) throw new Error("CANCELLED");
  await failIfLoggedOut();

  const { tabId, created } = await getAuditPageTab();
  const runId = crypto.randomUUID();
  const cancel = () =>
    void sendTabMessage(tabId, { type: "CANCEL_RUN", runId }).catch(
      () => undefined,
    );
  signal.addEventListener("abort", cancel);
  const stopPing = keepAlive();
  try {
    // Superseded while the tab was opening: nothing was sent, nothing to cancel.
    if (signal.aborted) throw new Error("CANCELLED");
    const result = await sendTabMessageWhenReady(tabId, {
      type: "RUN_AUDIT",
      runId,
      ...request,
    });
    if (!result) throw new Error("No response from audit page");
    if (!result.ok) throw new Error(result.error);
    return result.outcome;
  } catch (error) {
    // The tab found the session dead mid-run.
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      await openLoginTab();
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    stopPing();
    if (created) await browser.tabs.remove(tabId).catch(() => undefined);
  }
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

function registerAuditRunHandlers(): void {
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
        void runNewAudit({ custom: message.custom }).then(
          ({ cardId: auditId }) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              auditId,
            }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, failure(error)),
        );
        return true;
      }

      if (message.type === "ACCEPT_PREVIEW") {
        void acceptPreview(message.auditId).then(
          (auditId) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              auditId,
            }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, failure(error)),
        );
        return true;
      }

      if (message.type === "CHECK_PLANNER") {
        void checkPlanner().then(
          (courses) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              courses,
            }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, failure(error)),
        );
        return true;
      }

      if (message.type === "UPDATE_PLANNER") {
        void updatePlanner(message.keep, message.remove, message.auditId).then(
          (auditId) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              auditId,
            }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, failure(error)),
        );
        return true;
      }

      if (message.type === "PREVIEW_COURSE") {
        void previewCourse(message.course, message.auditId).then(
          (preview) =>
            sendMessageResponse(message, sendResponse, {
              success: true,
              ...preview,
            }),
          (error: unknown) =>
            sendMessageResponse(message, sendResponse, failure(error)),
        );
        return true;
      }

      // the UI hop of a delete; the UT tab does the work
      if (message.type === "DELETE_AUDIT") {
        void toActionResult(deleteAudit(message.auditId)).then((result) =>
          sendMessageResponse(message, sendResponse, result),
        );
        return true;
      }
    },
  );
}

// The failed reply for a run. A cancel is expected, so it is not an error log.
function failure(error: unknown): { success: false; error: string } {
  const reason = error instanceof Error ? error.message : String(error);
  if (reason !== "CANCELLED") console.error("Failed to run audit:", error);
  return { success: false, error: reason };
}

// Forwards a delete to a content script on a UT audits page — the only
// context whose origin passes UT's CSRF checks. Not queued behind runs: it
// adds no history row, so a run waiting on its own row is unaffected.
async function deleteAudit(auditId: string): Promise<void> {
  await failIfLoggedOut();
  const { tabId, created } = await getAuditPageTab();
  try {
    const result = await sendTabMessageWhenReady(tabId, {
      type: "DELETE_AUDIT",
      auditId,
    });
    if (!result) throw new Error("No response from audit page");
    if (!result.ok) {
      if (result.error === "AUTH_REQUIRED") await openLoginTab();
      throw new Error(result.error);
    }
  } finally {
    if (created) await browser.tabs.remove(tabId).catch(() => undefined);
  }
}

// A dead session would land a hidden tab on SSO, where our content script
// never runs. Send the user to log in instead. The cached read is instant;
// the UT tab re-checks the session on every request.
async function failIfLoggedOut(): Promise<void> {
  if ((await getCachedLoginState()) !== false) return;
  await openLoginTab();
  throw new Error("AUTH_REQUIRED");
}

export function registerAuditBackgroundController(): void {
  registerAuditRunHandlers();
  registerAuditScrapingHandlers();
  registerSessionCookieWatcher();
  registerPlannerBridge({
    getAuditPageTab,
    sendToTab: sendTabMessageWhenReady,
    closeTab: (tabId) => browser.tabs.remove(tabId),
  });
}
