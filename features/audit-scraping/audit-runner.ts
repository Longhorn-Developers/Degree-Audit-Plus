// Runs one audit on UT from a content script on a UT page.
// all of this run s in the tab itself.
import type { CachedAuditData, CustomAuditRunRequest } from "@/domain/audit";
import { isLoginPage } from "@/features/session/session";
import type { AuditRunOutcome, AuditRunTiming } from "@/lib/browser/messages";
import {
  toAuditHistoryEntries,
  type AuditHistoryRow,
} from "./audit-history-parser";
import {
  fetchAuditHistoryRows,
  fetchAuditResults,
  RUN_AUDIT_BUTTON_SELECTOR,
} from "./audit-history-sync";

const RUN_PAGE_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

// The individual-audit form; its selects populate only when the page is
// fetched with catalog+college query parameters.
const CUSTOM_FORM_SELECTOR = "#single_request";

export interface RunTimingOptions {
  pollIntervalMs: number;
  // How long UT gets to show our row after the POST (spike: ~140 ms).
  acceptWindowMs: number;
  // How long UT gets to finish generating (spike: 2–11 s).
  runWindowMs: number;
}

const DEFAULT_TIMING: RunTimingOptions = {
  pollIntervalMs: 150,
  acceptWindowMs: 10_000,
  runWindowMs: 90_000,
};

// History fetches that may fail in a row before the run gives up.
// TODO: remove thsi later if we dont need it
const MAX_POLL_FAILURES = 3;

interface PreparedRun {
  form: HTMLFormElement;
  action: string;
}

interface FoundAudit {
  auditId: string;
  rows: AuditHistoryRow[];
  rowSeenAt: number;
  detectedAt: number;
}

export interface RunAuditRequest {
  custom?: CustomAuditRunRequest;
  // Lets the background cancel this run by id (see cancelRun).
  runId?: string;
}

// Runs the background no longer cares about; checked between steps.
const cancelledRuns = new Set<string>(); // TODO: 5.5 we can remove all audits from this queue when we get some time. 

export function cancelRun(runId: string): void {
  cancelledRuns.add(runId);
}

// The one entry point. Everything below is a step of it.
export async function runAudit(
  { custom, runId }: RunAuditRequest = {},
  timing: Partial<RunTimingOptions> = {},
): Promise<AuditRunOutcome> {
  const options = { ...DEFAULT_TIMING, ...timing };

  // Both are read-only, so overlap them.
  const [before, prepared] = await Promise.all([
    fetchAuditHistoryRows(),
    fetchRunForm(custom),
  ]);
  const known = new Set(before.map((row) => row.key));

  // Cancelled before the POST: nothing on UT, nothing to clean up.
  assertNotCancelled(runId);
  const submittedAt = Date.now();
  await submitForm(prepared);

  const found = await waitForNewAudit(known, submittedAt, options, runId);

  const scrapeStartedAt = Date.now();
  const result = await fetchAuditResults(found.auditId);
  if ("error" in result) throw new Error(result.error);
  const scrapeEndedAt = Date.now();

  const stamps = {
    submittedAt,
    rowSeenAt: found.rowSeenAt,
    detectedAt: found.detectedAt,
    scrapeStartedAt,
    scrapeEndedAt,
  };
  logRun(found.auditId, result.audit, stamps);

  return {
    auditId: found.auditId,
    audit: result.audit,
    history: toAuditHistoryEntries(found.rows),
    timing: stamps,
  };
}

// ------------------------------------------------------------------- steps

// Fetches the run page and fills in the form to post: the default-degree
// "Run Audit" form, or the custom one when options are given. Submits nothing.
async function fetchRunForm(
  custom?: CustomAuditRunRequest,
): Promise<PreparedRun> {
  if (!custom) {
    const page = await fetchRunPage();
    const form = page.querySelector(RUN_AUDIT_BUTTON_SELECTOR)?.closest("form");
    if (!form) throw new Error("RUN_BUTTON_NOT_FOUND");
    // Resolve the action against the fetched page, not the current one —
    // DOMParser documents inherit the creating page's base URL.
    const action = new URL(form.getAttribute("action") ?? "", RUN_PAGE_URL);
    return { form, action: action.toString() };
  }
  // custom audits
  const query = new URLSearchParams({
    catalog: custom.catalog,
    college: custom.college,
  });
  const page = await fetchRunPage(`?${query}`);
  const form = page.querySelector<HTMLFormElement>(CUSTOM_FORM_SELECTOR);
  if (!form) throw new Error("RUN_FORM_NOT_FOUND");

  setSelect(form, "degree_plan", custom.degreePlan);
  if (custom.minor) setSelect(form, "minor", custom.minor);
  if (custom.certificate) setSelect(form, "certificate", custom.certificate);
  setCheckbox(form, "current", custom.includeCurrent ?? true);
  setCheckbox(form, "future", custom.includeFuture ?? false);
  setCheckbox(form, "planned", custom.includePlanned ?? false);

  // The form posts to its own parameterized URL (action="").
  return { form, action: `${RUN_PAGE_URL}?${query}` };
}

async function fetchRunPage(search = ""): Promise<Document> {
  const response = await fetch(`${RUN_PAGE_URL}${search}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("RUN_FAILED");

  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (isLoginPage(page)) throw new Error("AUTH_REQUIRED");
  return page;
}

// POSTs the form without following UT's redirect: the redirect itself is the
// "accepted" signal, and the poll downloads the history page anyway.
// A 200 means UT re-rendered the form and queued nothing.
async function submitForm({ form, action }: PreparedRun): Promise<void> {
  const body = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    body.append(key, String(value));
  }
  // FormData omits the submit control's pair, which UT's views expect
  // (e.g. audit="Submit Audit").
  const submit = form.querySelector<HTMLInputElement | HTMLButtonElement>(
    '[type="submit"]',
  );
  if (submit?.name) body.append(submit.name, submit.value);

  const response = await fetch(action, {
    method: "POST",
    credentials: "include",
    redirect: "manual",
    body,
  });
  // A logged-out session also redirects (to SSO);
  if (response.type === "opaqueredirect") return;

  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  throw new Error(isLoginPage(page) ? "AUTH_REQUIRED" : "RUN_FAILED");
}

// Polls history until our request shows up and finishes. Phase 1: a row whose
// key we did not know before the POST — that is ours (UT shows it ~140 ms
// after accepting). Phase 2: that same row has a result link.
async function waitForNewAudit(
  known: Set<string>,
  submittedAt: number,
  options: RunTimingOptions,
  runId?: string,
): Promise<FoundAudit> {
  const acceptDeadline = submittedAt + options.acceptWindowMs;
  const runDeadline = submittedAt + options.runWindowMs;
  let ourKey: string | undefined;
  let rowSeenAt = 0;
  let failures = 0;

  while (Date.now() < (ourKey === undefined ? acceptDeadline : runDeadline)) {
    assertNotCancelled(runId);
    let rows: AuditHistoryRow[];
    try {
      rows = await fetchAuditHistoryRows();
      failures = 0;
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        throw error;
      }
      if (++failures >= MAX_POLL_FAILURES) throw error;
      await sleep(options.pollIntervalMs);
      continue;
    }

    if (ourKey === undefined) {
      const fresh = rows.find((row) => !known.has(row.key));
      if (fresh) {
        ourKey = fresh.key;
        rowSeenAt = Date.now();
      }
    }
    if (ourKey !== undefined) {
      const ours = rows.find((row) => row.key === ourKey);
      if (ours?.auditId) {
        return {
          auditId: ours.auditId,
          rows,
          rowSeenAt,
          detectedAt: Date.now(),
        };
      }
    }
    await sleep(options.pollIntervalMs);
  }

  throw new Error(ourKey === undefined ? "RUN_NOT_ACCEPTED" : "RUN_TIMEOUT");
}

// ------------------------------------------------------------------ helpers

// One line per run: how long each step took and what the scrape found.
function logRun(
  auditId: string,
  audit: CachedAuditData,
  t: AuditRunTiming,
): void {
  console.log(
    `Audit ${auditId} done in ${t.scrapeEndedAt - t.submittedAt} ms: ` +
      `accepted ${t.rowSeenAt - t.submittedAt} ms, ` +
      `generate ${t.detectedAt - t.rowSeenAt} ms, ` +
      `scrape ${t.scrapeEndedAt - t.scrapeStartedAt} ms · ` +
      `${audit.requirements.length} requirements, ` +
      `${Object.keys(audit.courses).length} courses`,
  );
}

function assertNotCancelled(runId?: string): void {
  if (runId === undefined || !cancelledRuns.has(runId)) return;
  cancelledRuns.delete(runId);
  throw new Error("CANCELLED");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setSelect(form: HTMLFormElement, name: string, value: string): void {
  const select = form.querySelector<HTMLSelectElement>(
    `select[name="${name}"]`,
  );
  if (!select) throw new Error("RUN_FORM_CHANGED");
  if (![...select.options].some((option) => option.value === value)) {
    // e.g. a degree plan UT doesn't offer for this catalog+college
    throw new Error("OPTION_NOT_AVAILABLE");
  }
  select.value = value;
}

function setCheckbox(
  form: HTMLFormElement,
  name: string,
  checked: boolean,
): void {
  const box = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (box) box.checked = checked;
}
