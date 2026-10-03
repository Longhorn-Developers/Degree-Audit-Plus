import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import type { AuditHistoryData, CachedAuditData } from "../../domain/audit";
import { fakeBrowser } from "wxt/testing/fake-browser";

mock.module("wxt/browser", () => ({ browser: fakeBrowser }));
mock.module("@wxt-dev/browser", () => ({ browser: fakeBrowser }));

const {
  deleteAuditData,
  getAuditData,
  getAuditHistory,
  getUncachedAuditIds,
  observeAuditHistory,
  renameAudit,
  saveAuditData,
  saveAuditHistory,
  togglePinAudit,
  watchAuditHistory,
} = await import("../../features/audit/audit-storage");

beforeEach(() => {
  fakeBrowser.reset();
});

test("reads existing audit history without migrating its storage key", async () => {
  const history: AuditHistoryData = {
    audits: [{ auditId: "audit-1", title: "Computer Science" }],
    timestamp: 123,
  };
  await fakeBrowser.storage.local.set({ auditHistory: history });

  expect(await getAuditHistory()).toEqual(history);
});

test("watches audit history through the typed storage item", async () => {
  const updates: Array<AuditHistoryData | null> = [];
  const unwatch = watchAuditHistory((history) => updates.push(history));

  await saveAuditHistory([{ auditId: "audit-1" }]);
  unwatch();
  await saveAuditHistory([{ auditId: "audit-2" }]);

  expect(updates).toHaveLength(1);
  expect(updates[0]?.audits).toEqual([{ auditId: "audit-1" }]);
});

test("observes the initial audit history and later updates", async () => {
  const initial: AuditHistoryData = {
    audits: [{ auditId: "audit-1" }],
    timestamp: 1,
  };
  await fakeBrowser.storage.local.set({ auditHistory: initial });

  const updates: Array<AuditHistoryData | null> = [];
  const unobserve = observeAuditHistory((history) => updates.push(history));
  await Bun.sleep(0);

  await saveAuditHistory([{ auditId: "audit-2" }]);
  unobserve();

  expect(updates[0]).toEqual(initial);
  expect(updates[1]?.audits).toEqual([{ auditId: "audit-2" }]);
});

test("stops initial and watched audit history delivery after cleanup", async () => {
  const updates: Array<AuditHistoryData | null> = [];
  const unobserve = observeAuditHistory((history) => updates.push(history));

  unobserve();
  await Bun.sleep(0);
  await saveAuditHistory([{ auditId: "audit-1" }]);

  expect(updates).toEqual([]);
});

test("reports an initial audit history read failure", async () => {
  const failure = new Error("history read failed");
  const get = spyOn(fakeBrowser.storage.local, "get").mockRejectedValueOnce(
    failure,
  );
  const errors: unknown[] = [];

  const unobserve = observeAuditHistory(
    () => {},
    (error) => errors.push(error),
  );
  await Bun.sleep(0);
  unobserve();
  get.mockRestore();

  expect(errors).toEqual([failure]);
});

test("does not let a stale initial read replace a newer watched update", async () => {
  const stale: AuditHistoryData = {
    audits: [{ auditId: "stale" }],
    timestamp: 1,
  };
  let resolveInitialRead!: (value: Record<string, unknown>) => void;
  const initialRead = new Promise<Record<string, unknown>>((resolve) => {
    resolveInitialRead = resolve;
  });
  const get = spyOn(fakeBrowser.storage.local, "get").mockImplementationOnce(
    () => initialRead,
  );
  const updates: Array<AuditHistoryData | null> = [];

  const unobserve = observeAuditHistory((history) => updates.push(history));
  await saveAuditHistory([{ auditId: "newer" }]);
  resolveInitialRead({ auditHistory: stale });
  await Bun.sleep(0);
  unobserve();
  get.mockRestore();

  expect(updates).toHaveLength(1);
  expect(updates[0]?.audits).toEqual([{ auditId: "newer" }]);
});

test("finds uncached audits with one storage read", async () => {
  await fakeBrowser.storage.local.set({
    auditData_cached: { requirements: [], courses: {} },
    auditData_null: null,
  });
  const get = spyOn(fakeBrowser.storage.local, "get");

  expect(
    await getUncachedAuditIds(["cached", "missing", "null", "missing"]),
  ).toEqual(["missing", "null", "missing"]);
  expect(get).toHaveBeenCalledTimes(1);
  get.mockRestore();
});

test("reloads the exact canonical audit object that was saved", async () => {
  const audit: CachedAuditData = {
    requirements: [],
    courses: {
      planned: {
        id: "planned",
        code: "M 408C",
        name: "Differential and Integral Calculus",
        hours: 4,
        semester: "Spring 2027",
        status: "Planned",
        type: "In-Residence",
      },
    },
  };

  await saveAuditData("audit-1", audit);

  expect(await getAuditData("audit-1")).toEqual(audit);
});

test("deletes only the given audits' cached data", async () => {
  const audit: CachedAuditData = { requirements: [], courses: {} };
  await saveAuditData("audit-1", audit);
  await saveAuditData("audit-2", audit);
  await saveAuditData("audit-3", audit);

  await deleteAuditData(["audit-1", "audit-3"]);

  expect(await getAuditData("audit-1")).toBeNull();
  expect(await getAuditData("audit-2")).toEqual(audit);
  expect(await getAuditData("audit-3")).toBeNull();
});

test("keeps renames and pins when a sync rewrites the history", async () => {
  await saveAuditHistory([
    { auditId: "audit-1", title: "Degree Audit 1" },
    { auditId: "audit-2", title: "Degree Audit 2" },
  ]);
  await renameAudit("audit-1", "My CS Audit");
  await togglePinAudit("audit-2");

  // a sync rebuilds every entry from UT's page with default titles
  await saveAuditHistory([
    { auditId: "audit-1", title: "Degree Audit 1" },
    { auditId: "audit-2", title: "Degree Audit 2" },
    { auditId: "audit-3", title: "Degree Audit 3" },
  ]);

  expect((await getAuditHistory())?.audits).toEqual([
    { auditId: "audit-1", title: "My CS Audit" },
    { auditId: "audit-2", title: "Degree Audit 2", pinned: true },
    { auditId: "audit-3", title: "Degree Audit 3" },
  ]);
});
