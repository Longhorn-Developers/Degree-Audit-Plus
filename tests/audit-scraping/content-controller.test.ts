import { beforeEach, expect, mock, spyOn, test } from "bun:test";
import { JSDOM } from "jsdom";
import type { ExtensionMessage } from "../../lib/browser/messages";

let listener: ((message: ExtensionMessage) => void) | undefined;
let parseShouldThrow = false;
let syncCalls = 0;
let sentMessages: ExtensionMessage[] = [];

mock.module("../../features/audit-scraping/audit-history-sync", () => ({
  startAuditHistorySync: async () => {
    syncCalls++;
  },
}));
mock.module("../../features/audit-scraping/audit-page-parser", () => ({
  checkLoginRequired: () => false,
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
});

function createDocument(pathname: string, body = ""): Document {
  return new JSDOM(`<body>${body}</body>`, {
    url: `https://utdirect.utexas.edu${pathname}`,
  }).window.document;
}

test("only syncs audit history on the audit landing page", () => {
  startAuditContentController(createDocument("/apps/degree/audits/"));
  expect(syncCalls).toBe(1);

  startAuditContentController(
    createDocument("/apps/degree/audits/results/12345/"),
  );
  expect(syncCalls).toBe(1);
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
