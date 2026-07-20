import { beforeEach, expect, mock, test } from "bun:test";
import { JSDOM } from "jsdom";
import type { ExtensionMessage } from "../../lib/browser/messages";

type MessageListener = (
  message: ExtensionMessage,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean | undefined;

let listener: MessageListener | undefined;
let syncCalls = 0;
let resumeCalls = 0;
let watchedRunClicks = 0;
let recordedLoginPages = 0;
let fetchedAuditIds: string[] = [];
let ranAudits: unknown[] = [];

mock.module("../../features/audit-scraping/audit-history-sync", () => ({
  startAuditHistorySync: async () => {
    syncCalls++;
  },
  resumePendingAuditPoll: async () => {
    resumeCalls++;
    return false;
  },
  watchForAuditRunClicks: () => {
    watchedRunClicks++;
  },
  fetchAuditResults: async (auditId: string) => {
    fetchedAuditIds.push(auditId);
    return { audit: { courses: {}, requirements: [] } };
  },
}));
mock.module("../../features/audit-scraping/audit-runner", () => ({
  runAudit: async (custom?: unknown) => {
    ranAudits.push(custom);
  },
}));
mock.module("../../features/session/session", () => ({
  recordLoginStateFromPage: () => {
    recordedLoginPages++;
  },
}));
mock.module("../../lib/browser/messages", () => ({
  sendMessageResponse: (
    _request: ExtensionMessage,
    sendResponse: (response: unknown) => void,
    response: unknown,
  ) => sendResponse(response),
}));

(
  globalThis as typeof globalThis & {
    browser: typeof browser;
  }
).browser = {
  runtime: {
    onMessage: {
      addListener: (nextListener: MessageListener) => {
        listener = nextListener;
      },
    },
  },
} as unknown as typeof browser;

const { startAuditContentController } =
  await import("../../features/audit-scraping/content-controller");

beforeEach(() => {
  listener = undefined;
  syncCalls = 0;
  resumeCalls = 0;
  watchedRunClicks = 0;
  recordedLoginPages = 0;
  fetchedAuditIds = [];
  ranAudits = [];
});

function createDocument(pathname: string, body = ""): Document {
  return new JSDOM(`<body>${body}</body>`, {
    url: `https://utdirect.utexas.edu${pathname}`,
  }).window.document;
}

test("syncs audit history on the landing and request-history pages", () => {
  for (const pathname of [
    "/apps/degree/audits/",
    "/apps/degree/audits/submissions/history/",
    "/apps/degree/audits/requests/history/",
  ]) {
    startAuditContentController(createDocument(pathname));
  }
  expect(syncCalls).toBe(3);
  expect(resumeCalls).toBe(0);
  // every page load records the login state it sees in the DOM
  expect(recordedLoginPages).toBe(3);
});

test("resumes a pending run's poll on the run-audit page", () => {
  for (const pathname of [
    "/apps/degree/audits/submissions/student_individual/",
    "/apps/degree/audits/requests/student_individual/",
  ]) {
    startAuditContentController(createDocument(pathname));
  }
  expect(syncCalls).toBe(0);
  expect(resumeCalls).toBe(2);
});

test("neither syncs nor polls on audit result pages", () => {
  startAuditContentController(
    createDocument("/apps/degree/audits/results/12345/"),
  );
  expect(syncCalls).toBe(0);
  expect(resumeCalls).toBe(0);
  // run-button clicks are still watched on every audits page
  expect(watchedRunClicks).toBe(1);
});

test("serves FETCH_AUDIT requests from the background", async () => {
  startAuditContentController(
    createDocument("/apps/degree/audits/results/12345/"),
  );

  const responses: unknown[] = [];
  const handled = listener?.(
    { type: "FETCH_AUDIT", auditId: "12345" },
    {},
    (response) => responses.push(response),
  );

  // returning true keeps the sendResponse channel open for the async fetch
  expect(handled).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(fetchedAuditIds).toEqual(["12345"]);
  expect(responses).toEqual([{ audit: { courses: {}, requirements: [] } }]);
});

test("serves RUN_AUDIT_VIA_FETCH requests from the background", async () => {
  startAuditContentController(createDocument("/apps/degree/audits/"));

  const responses: unknown[] = [];
  const custom = { catalog: "20259", college: "E", degreePlan: "EBC SSA    " };
  const handled = listener?.(
    { type: "RUN_AUDIT_VIA_FETCH", custom },
    {},
    (response) => responses.push(response),
  );

  expect(handled).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(ranAudits).toEqual([custom]);
  expect(responses).toEqual([{ ok: true }]);
});

test("ignores unrelated messages", () => {
  startAuditContentController(createDocument("/apps/degree/audits/"));
  const handled = listener?.({ type: "SCRAPE_ALL_STARTED" }, {}, () => {});
  expect(handled).toBeUndefined();
  expect(fetchedAuditIds).toEqual([]);
});
