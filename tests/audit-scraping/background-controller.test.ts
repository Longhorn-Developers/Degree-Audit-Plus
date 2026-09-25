import { describe, expect, test } from "bun:test";
import type { CachedAuditData } from "../../domain/audit";
import {
  AuditBatchController,
  type AuditBatchDependencies,
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
