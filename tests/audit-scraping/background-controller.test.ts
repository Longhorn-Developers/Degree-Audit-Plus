import { describe, expect, test } from "bun:test";
import type { CachedAuditData } from "../../domain/audit";
import {
  AuditBatchController,
  createAuditRunner,
  type AuditBatchDependencies,
  type AuditRunDependencies,
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

// a fake ut. a submitted audit takes a few polls to show up, and every row
// dedupes to the same ui entry so only the raw ids tell them apart
function createFakeUt() {
  const events: string[] = [];
  let rawIds = ["100", "101"];
  let pendingId: string | undefined;
  let pollsLeft = 0;
  let nextId = 102;

  const deps: AuditRunDependencies = {
    getAuditPageTab: async () => ({ tabId: TAB_ID, created: true }),
    fetchHistory: async () => {
      if (pendingId && pollsLeft > 0) pollsLeft--;
      if (pendingId && pollsLeft === 0) {
        rawIds = [pendingId, ...rawIds];
        pendingId = undefined;
      }
      return { audits: [{ auditId: rawIds[0] }], auditIds: rawIds };
    },
    submit: async () => {
      pendingId = String(nextId);
      pollsLeft = 3;
      nextId++;
      events.push(`submit ${pendingId}`);
      return { ok: true };
    },
    scrapeAudit: async (auditId) => {
      events.push(`scrape ${auditId}`);
      return audit;
    },
    saveHistory: async () => {},
    saveAudit: async (auditId) => {
      events.push(`save ${auditId}`);
    },
    closeTab: async () => {
      events.push("close tab");
    },
    pollIntervalMs: 1,
  };
  return { deps, events };
}

test("audit runs go one at a time and each resolves to its own new id", async () => {
  const { deps, events } = createFakeUt();
  const run = createAuditRunner(deps);

  const [first, second] = await Promise.all([run(), run()]);

  expect(first.auditId).toBe("102");
  expect(second.auditId).toBe("103");
  // the tab closes only after its run is scraped, then the next run starts
  expect(events).toEqual([
    "submit 102",
    "scrape 102",
    "save 102",
    "close tab",
    "submit 103",
    "scrape 103",
    "save 103",
    "close tab",
  ]);

  const timing = first.timing;
  expect(timing.submittedAt).toBeLessThanOrEqual(timing.detectedAt);
  expect(timing.detectedAt).toBeLessThanOrEqual(timing.scrapeStartedAt);
  expect(timing.scrapeStartedAt).toBeLessThanOrEqual(timing.scrapeEndedAt);
});
