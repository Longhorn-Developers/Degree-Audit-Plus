import { expect, mock, test } from "bun:test";
import type { CachedAuditData } from "../../domain/audit";

const store: Record<string, unknown> = {};
mock.module("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: store[key] }),
        set: async (values: Record<string, unknown>) =>
          Object.assign(store, values),
      },
    },
  },
}));

const { getAuditData, saveAuditData } =
  await import("../../lib/storage/audit-storage");

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
