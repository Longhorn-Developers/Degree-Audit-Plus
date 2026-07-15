import { describe, expect, test } from "bun:test";
import type { CachedAuditData } from "../../domain/audit";
import {
  AuditBatchController,
  type AuditBatchDependencies,
} from "../../features/audit-scraping/background-controller";

const audit: CachedAuditData = { courses: {}, requirements: [] };

function createController(
  overrides: Partial<AuditBatchDependencies> = {},
): AuditBatchController {
  return new AuditBatchController({
    startScrape: async () => {},
    saveAudit: async () => {},
    closeTab: async () => {},
    closeWindow: async () => {},
    broadcast: async () => {},
    delay: async () => {},
    scrapeTimeoutMs: 20,
    ...overrides,
  });
}

describe("audit batch controller", () => {
  test("completes a batch after each audit result is saved", async () => {
    const saved: string[] = [];
    const controller = createController({
      startScrape: async (auditId) => {
        queueMicrotask(() => void controller.receiveResult(auditId, audit));
      },
      saveAudit: async (auditId) => {
        saved.push(auditId);
      },
    });

    expect(controller.start(["101", "102"])).toBe(true);
    expect(await controller.waitForIdle()).toEqual({
      succeeded: ["101", "102"],
      failed: [],
    });
    expect(saved).toEqual(["101", "102"]);
  });

  test("times out a scrape that never responds", async () => {
    const controller = createController({ scrapeTimeoutMs: 1 });

    controller.start(["timeout"]);

    expect(await controller.waitForIdle()).toEqual({
      succeeded: [],
      failed: ["timeout"],
    });
  });

  test("rejects a concurrent batch without disturbing the active batch", async () => {
    const controller = createController({
      startScrape: async (auditId) => {
        queueMicrotask(() => void controller.receiveResult(auditId, audit));
      },
    });

    expect(controller.start(["active"])).toBe(true);
    expect(controller.start(["duplicate"])).toBe(false);
    expect(await controller.waitForIdle()).toEqual({
      succeeded: ["active"],
      failed: [],
    });
  });

  test("records authentication failures and closes their tab", async () => {
    const closedTabs: number[] = [];
    const controller = createController({
      startScrape: async (auditId) => {
        queueMicrotask(() =>
          controller.receiveFailure(auditId, "AUTH_REQUIRED", 42),
        );
      },
      closeTab: async (tabId) => {
        closedTabs.push(tabId);
      },
    });

    controller.start(["private"]);

    expect(await controller.waitForIdle()).toEqual({
      succeeded: [],
      failed: ["private"],
    });
    expect(closedTabs).toEqual([42]);
  });
});
