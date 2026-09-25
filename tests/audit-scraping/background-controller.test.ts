import { describe, expect, test } from "bun:test";
import type { CachedAuditData } from "../../domain/audit";
import {
  AuditBatchController,
  createRunNewAudit,
  type AuditBatchDependencies,
  type RunNewAuditDependencies,
} from "../../features/audit-scraping/background-controller";

const audit: CachedAuditData = { courses: {}, requirements: [] };
const TAB_ID = 7;

function createController(
  overrides: Partial<AuditBatchDependencies> = {},
): AuditBatchController {
  return new AuditBatchController({
    scrapeAudit: async () => audit,
    saveAudit: async () => {},
    broadcast: async () => {},
    scrapeTimeoutMs: 20,
    ...overrides,
  });
}

describe("audit batch controller", () => {
  test("scrapes and saves every audit in a batch", async () => {
    const saved: string[] = [];
    const scraped: Array<[string, number]> = [];
    const controller = createController({
      scrapeAudit: async (auditId, tabId) => {
        scraped.push([auditId, tabId]);
        return audit;
      },
      saveAudit: async (auditId) => {
        saved.push(auditId);
      },
    });

    expect(controller.start(["101", "102"], TAB_ID)).toBe(true);
    expect(await controller.waitForIdle()).toEqual({
      succeeded: ["101", "102"],
      failed: [],
    });
    expect(saved).toEqual(["101", "102"]);
    expect(scraped).toEqual([
      ["101", TAB_ID],
      ["102", TAB_ID],
    ]);
  });

  test("continues past individual scrape failures", async () => {
    const controller = createController({
      scrapeAudit: async (auditId) => {
        if (auditId === "bad") throw new Error("SCRAPE_FAILED");
        return audit;
      },
    });

    controller.start(["bad", "good"], TAB_ID);
    expect(await controller.waitForIdle()).toEqual({
      succeeded: ["good"],
      failed: ["bad"],
    });
  });

  test("aborts the rest of the batch when the session dies", async () => {
    let scrapes = 0;
    const controller = createController({
      scrapeAudit: async () => {
        scrapes++;
        throw new Error("AUTH_REQUIRED");
      },
      concurrency: 1,
    });

    controller.start(["1", "2", "3"], TAB_ID);
    expect(await controller.waitForIdle()).toEqual({
      succeeded: [],
      failed: ["1", "2", "3"],
    });
    expect(scrapes).toBe(1);
  });

  test("fetches audits in parallel up to the concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const controller = createController({
      scrapeAudit: async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight--;
        return audit;
      },
      concurrency: 2,
    });

    controller.start(["1", "2", "3", "4"], TAB_ID);
    const result = await controller.waitForIdle();
    expect(result?.succeeded.toSorted()).toEqual(["1", "2", "3", "4"]);
    expect(maxInFlight).toBe(2);
  });

  test("times out a scrape that never responds", async () => {
    const controller = createController({
      scrapeAudit: () => new Promise<never>(() => {}),
      scrapeTimeoutMs: 10,
    });

    controller.start(["stuck"], TAB_ID);
    expect(await controller.waitForIdle()).toEqual({
      succeeded: [],
      failed: ["stuck"],
    });
  });

  test("refuses to start while a batch is running", async () => {
    const controller = createController();
    expect(controller.start(["1"], TAB_ID)).toBe(true);
    expect(controller.start(["2"], TAB_ID)).toBe(false);
    await controller.waitForIdle();
    expect(controller.isSyncing).toBe(false);
  });

  test("broadcasts start and completion around a batch", async () => {
    const states: string[] = [];
    const controller = createController({
      broadcast: async (state) => {
        states.push(state);
      },
    });

    controller.start(["1"], TAB_ID);
    await controller.waitForIdle();
    expect(states).toEqual(["started", "complete"]);
  });
});

const OUTCOME = {
  auditId: "200",
  audit,
  history: [{ auditId: "200" }],
  timing: {
    submittedAt: 1,
    rowSeenAt: 2,
    detectedAt: 3,
    scrapeStartedAt: 4,
    scrapeEndedAt: 5,
  },
};

function createRunDeps(overrides: Partial<RunNewAuditDependencies> = {}) {
  const events: string[] = [];
  const deps: RunNewAuditDependencies = {
    isLoggedIn: async () => true,
    openLoginTab: async () => {
      events.push("login tab");
    },
    getAuditPageTab: async () => ({ tabId: TAB_ID, created: true }),
    runInTab: async () => {
      events.push("run");
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { ok: true, outcome: OUTCOME };
    },
    saveHistory: async () => {
      events.push("save history");
    },
    saveAudit: async (auditId) => {
      events.push(`save ${auditId}`);
    },
    cancelInTab: async () => {
      events.push("cancel");
    },
    closeTab: async () => {
      events.push("close tab");
    },
    recordTiming: async () => {
      events.push("timing");
    },
    ...overrides,
  };
  return { deps, events };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
const ONE_RUN = ["run", "save history", "save 200", "timing", "close tab"];

describe("run new audit", () => {
  test("runs, saves, records timing, then closes the tab it opened", async () => {
    const { deps, events } = createRunDeps();
    const result = await createRunNewAudit(deps)();

    expect(result).toEqual({ auditId: "200", timing: OUTCOME.timing });
    expect(events).toEqual(ONE_RUN);
  });

  test("a new request cancels the run in flight and runs instead", async () => {
    let release!: () => void;
    const firstCancelled = new Promise<void>((resolve) => (release = resolve));
    let calls = 0;
    const { deps, events } = createRunDeps({
      cancelInTab: async () => {
        events.push("cancel");
        release();
      },
      // the fake tab: the first run only ends once it is cancelled
      runInTab: async () => {
        events.push("run");
        if (++calls === 1) {
          await firstCancelled;
          return { ok: false, error: "CANCELLED" };
        }
        return { ok: true, outcome: OUTCOME };
      },
    });
    const run = createRunNewAudit(deps);
    const first = run();
    await settle();
    const second = run();

    await expect(first).rejects.toThrow("CANCELLED");
    expect(await second).toEqual({ auditId: "200", timing: OUTCOME.timing });
    expect(events).toEqual(["run", "cancel", "close tab", ...ONE_RUN]);
  });

  test("a request superseded before it starts never touches a tab", async () => {
    const { deps, events } = createRunDeps();
    const run = createRunNewAudit(deps);
    const [first, second] = await Promise.allSettled([run(), run()]);

    expect(first.status).toBe("rejected");
    expect(second.status).toBe("fulfilled");
    expect(events).toEqual(ONE_RUN);
  });

  test("a failed run closes its tab, opens login on AUTH_REQUIRED, and does not block the next", async () => {
    let calls = 0;
    const { deps, events } = createRunDeps({
      runInTab: async () =>
        ++calls === 1
          ? { ok: false, error: "AUTH_REQUIRED" }
          : { ok: true, outcome: OUTCOME },
    });
    const run = createRunNewAudit(deps);
    await expect(run()).rejects.toThrow("AUTH_REQUIRED");
    await run();

    expect(events).toContain("login tab");
    expect(events.filter((e) => e === "close tab")).toHaveLength(2);
  });

  test("never closes a tab the user already had open", async () => {
    const { deps, events } = createRunDeps({
      getAuditPageTab: async () => ({ tabId: TAB_ID, created: false }),
    });
    await createRunNewAudit(deps)();
    expect(events).not.toContain("close tab");
  });

  test("gives up when the tab never answers", async () => {
    const { deps, events } = createRunDeps({
      runInTab: () => new Promise(() => {}),
      runTimeoutMs: 5,
    });
    await expect(createRunNewAudit(deps)()).rejects.toThrow("RUN_TIMEOUT");
    expect(events).toContain("close tab");
  });
});
