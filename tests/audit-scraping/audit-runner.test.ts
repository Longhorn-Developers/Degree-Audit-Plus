import { afterEach, beforeEach, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  cancelRun,
  runAudit,
} from "../../features/audit-scraping/audit-runner";

// history cell 5 is Status: it flips from Processing to Completed, exactly
// like ut does, so a key that includes it would never match twice
const status = (auditId: string | null) =>
  auditId ? "Completed (00780)" : "Processing (00780)";

// a real results capture, so the scrape step parses like it does on ut
const RESULTS_HTML = await Bun.file(
  new URL("../fixtures/scraping/audit-results.html", import.meta.url),
).text();

// runs the audit runner against a fake ut: history page, run form, results.
// the point is correlation — we must end up with OUR audit, every time

const BASE = "https://utdirect.utexas.edu/apps/degree/audits";
const CS = "Computer Science - Credential: Business (BBA)";
const FAST = { pollIntervalMs: 1, acceptWindowMs: 50, runWindowMs: 200 };

interface HistoryRow {
  created: string;
  program: string;
  auditId: string | null;
}

function historyRow({ created, program, auditId }: HistoryRow): string {
  const link = auditId
    ? `<a href="/apps/degree/audits/results/${auditId}/">${auditId}</a>`
    : "Processing";
  return `<tr>
    <td>${created}</td><td>Individual</td><td>2024-2026</td>
    <td>${program}</td><td>In progress Future</td><td>${status(auditId)}</td>
    <td>${link}</td><td>85%</td>
  </tr>`;
}

function html(markup: string, status = 200): Response {
  return new Response(markup, { status });
}

function opaqueRedirect(): Response {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaqueredirect" });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
}

// a submitted audit shows up as a linkless row right away and grows its
// link after `generatePolls` more history reads
class FakeUT {
  requests: Array<{ url: string; init?: RequestInit }> = [];
  loggedIn = true;
  acceptsSubmit = true;
  queuesRow = true;
  generatePolls = 2;
  failNextHistoryFetches = 0;
  private nextId = 200;
  private pending: { row: HistoryRow; pollsLeft: number } | null = null;

  constructor(public rows: HistoryRow[]) {}

  // someone else's audit finishing right now
  finishForeign(auditId: string): void {
    this.rows.unshift({
      created: "09/24/2026 10:06 AM",
      program: "Math",
      auditId,
    });
  }

  async handle(url: string, init?: RequestInit): Promise<Response> {
    this.requests.push({ url, init });
    const { pathname } = new URL(url);

    if (pathname.endsWith("/submissions/history/")) {
      if (!this.loggedIn) return html('<form action="/login"></form>');
      if (this.failNextHistoryFetches-- > 0) return html("", 500);
      if (this.pending && this.pending.pollsLeft-- <= 0) {
        this.pending.row.auditId = String(this.nextId++);
        this.pending = null;
      }
      return html(
        `<table><tbody>${this.rows.map(historyRow).join("")}</tbody></table>`,
      );
    }

    if (pathname.endsWith("/submissions/student_individual/")) {
      if (init?.method !== "POST") {
        return html(
          `<form action="/apps/degree/audits/submissions/student_individual/" method="post">
             <input type="hidden" name="csrfmiddlewaretoken" value="tok">
             <input type="submit" name="audit" value="Submit Audit" class="run_button">
           </form>`,
        );
      }
      if (!this.acceptsSubmit) return html("<form></form>");
      if (this.queuesRow) {
        const row = {
          created: "09/24/2026 10:05 AM",
          program: CS,
          auditId: null,
        };
        this.rows.unshift(row);
        this.pending = { row, pollsLeft: this.generatePolls };
      }
      return opaqueRedirect();
    }

    if (pathname.startsWith("/apps/degree/audits/results/")) {
      return html(RESULTS_HTML);
    }
    throw new Error(`fake UT got an unexpected url: ${url}`);
  }
}

const originalFetch = globalThis.fetch;
const originalDOMParser = globalThis.DOMParser;
const originalFormData = globalThis.FormData;
let ut: FakeUT;

beforeEach(() => {
  const { window } = new JSDOM("");
  globalThis.DOMParser = window.DOMParser;
  // jsdom has no innerText; the results parser reads it
  Object.defineProperty(window.HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent ?? "";
    },
  });
  globalThis.FormData = window.FormData as unknown as typeof FormData;
  ut = new FakeUT([
    { created: "09/23/2026 09:00 AM", program: CS, auditId: "100" },
    // a request that was still generating when we started
    { created: "09/24/2026 09:59 AM", program: CS, auditId: null },
  ]);
  globalThis.fetch = ((url: string, init?: RequestInit) =>
    ut.handle(url, init)) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.DOMParser = originalDOMParser;
  globalThis.FormData = originalFormData;
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

test("submits, waits for its own row, scrapes it, and reports timing", async () => {
  const outcome = await runAudit({}, FAST);

  expect(outcome.auditId).toBe("200");
  expect(outcome.history[0]).toMatchObject({ auditId: "200" });

  const t = outcome.timing;
  expect(t.submittedAt).toBeLessThanOrEqual(t.rowSeenAt);
  expect(t.rowSeenAt).toBeLessThanOrEqual(t.detectedAt);
  expect(t.detectedAt).toBeLessThanOrEqual(t.scrapeStartedAt);
  expect(t.scrapeStartedAt).toBeLessThanOrEqual(t.scrapeEndedAt);
});

test("reads history and the form before the POST, and does not follow the redirect", async () => {
  await runAudit({}, FAST);

  const post = ut.requests.findIndex((r) => r.init?.method === "POST");
  const before = ut.requests.slice(0, post).map((r) => r.url);
  expect(before).toContain(`${BASE}/submissions/history/`);
  expect(before).toContain(`${BASE}/submissions/student_individual/`);
  expect(ut.requests[post].init?.redirect).toBe("manual");
});

test("does not adopt a foreign audit that finishes during the run", async () => {
  ut.generatePolls = 4;
  const run = runAudit({}, FAST);
  await settle();
  ut.finishForeign("999");
  expect((await run).auditId).toBe("200");
});

test("the earlier still-generating row finishing is not mistaken for ours", async () => {
  ut.generatePolls = 4;
  const run = runAudit({}, FAST);
  await settle();
  ut.rows.find((r) => r.created === "09/24/2026 09:59 AM")!.auditId = "150";
  expect((await run).auditId).toBe("200");
});

test("fails with RUN_FAILED when UT re-renders the form", async () => {
  ut.acceptsSubmit = false;
  await expect(runAudit({}, FAST)).rejects.toThrow("RUN_FAILED");
});

test("fails with RUN_NOT_ACCEPTED when the POST redirects but no row appears", async () => {
  ut.queuesRow = false;
  await expect(runAudit({}, FAST)).rejects.toThrow("RUN_NOT_ACCEPTED");
});

test("fails with RUN_TIMEOUT when the link never appears", async () => {
  ut.generatePolls = Number.POSITIVE_INFINITY;
  await expect(runAudit({}, FAST)).rejects.toThrow("RUN_TIMEOUT");
});

test("tolerates a flaky history fetch while polling", async () => {
  ut.generatePolls = 3;
  const run = runAudit({}, FAST);
  await settle();
  ut.failNextHistoryFetches = 2;
  expect((await run).auditId).toBe("200");
});

test("surfaces AUTH_REQUIRED when the session dies mid-poll", async () => {
  ut.generatePolls = 4;
  const run = runAudit({}, FAST);
  await settle();
  ut.loggedIn = false;
  await expect(run).rejects.toThrow("AUTH_REQUIRED");
});

test("a cancelled run stops polling and throws CANCELLED", async () => {
  ut.generatePolls = Number.POSITIVE_INFINITY;
  const run = runAudit({ runId: "r1" }, FAST);
  await settle();
  cancelRun("r1");
  await expect(run).rejects.toThrow("CANCELLED");

  const historyReads = () =>
    ut.requests.filter((r) => r.url.endsWith("/history/")).length;
  const readsAtCancel = historyReads();
  await settle();
  expect(historyReads()).toBe(readsAtCancel);
});

test("a run cancelled before its POST never submits", async () => {
  cancelRun("r2");
  await expect(runAudit({ runId: "r2" }, FAST)).rejects.toThrow("CANCELLED");
  expect(ut.requests.some((r) => r.init?.method === "POST")).toBe(false);
});
