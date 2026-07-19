import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import { JSDOM } from "jsdom";
import type { ExtensionMessage } from "../../lib/browser/messages";

let listener: ((message: ExtensionMessage) => void) | undefined;
let parseShouldThrow = false;
let syncCalls = 0;
let resumeCalls = 0;
let watchedRunClicks = 0;
let sentMessages: ExtensionMessage[] = [];
let recordedLoginPages = 0;

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
}));
mock.module("../../features/session/session", () => ({
  isLoginPage: () => false,
  recordLoginStateFromPage: () => {
    recordedLoginPages++;
  },
}));
mock.module("../../features/audit-scraping/audit-page-parser", () => ({
  parseAuditPage: () => {
    if (parseShouldThrow) throw new Error("Unexpected markup");
    return { courses: {}, requirements: [] };
  },
}));
mock.module("../../lib/browser/messages", () => ({
  sendRuntimeMessage: async (message: ExtensionMessage) => {
    sentMessages.push(message);
  },
}));

(
  globalThis as typeof globalThis & {
    browser: typeof browser;
  }
).browser = {
  runtime: {
    onMessage: {
      addListener: (nextListener: (message: ExtensionMessage) => void) => {
        listener = nextListener;
      },
    },
  },
} as unknown as typeof browser;

const { startAuditContentController } =
  await import("../../features/audit-scraping/content-controller");

beforeEach(() => {
  listener = undefined;
  parseShouldThrow = false;
  sentMessages = [];
  syncCalls = 0;
  resumeCalls = 0;
  watchedRunClicks = 0;
  recordedLoginPages = 0;
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
  startAuditContentController(
    createDocument("/apps/degree/audits/submissions/student_individual/"),
  );
  expect(syncCalls).toBe(0);
  expect(resumeCalls).toBe(1);
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

test("reports unexpected parser failures immediately", () => {
  const errorLog = spyOn(console, "error").mockImplementation(() => {});
  parseShouldThrow = true;
  startAuditContentController(
    createDocument(
      "/apps/degree/audits/results/12345/",
      '<div id="coursework"><table class="results"></table></div>',
    ),
  );

  listener?.({ type: "RUN_SCRAPER", auditId: "12345" });

  expect(sentMessages).toEqual([
    {
      type: "AUDIT_SCRAPE_ERROR",
      auditId: "12345",
      error: "PARSE_ERROR",
    },
  ]);
  errorLog.mockRestore();
});
