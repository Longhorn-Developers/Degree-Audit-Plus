// Runs one audit inside a UT tab: submit the form, wait for our row in the
// history table, scrape the result. It lives in the tab because the tab has
// the UT cookies, passes CSRF, and has a DOMParser.
import type { CustomAuditRunRequest } from "@/domain/audit";
import { isLoginPage } from "@/features/session/session";
import type { AuditRunOutcome } from "@/lib/browser/messages";
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

// How long UT gets to show our row after the POST (spike: ~140 ms) and to
// finish generating it (spike: 2–11 s). Tests shrink these.
export const DEFAULT_TIMING = {
  pollIntervalMs: 150,
  acceptWindowMs: 10_000,
  runWindowMs: 90_000,
};

interface RunForm {
  form: HTMLFormElement;
  action: string;
}

// Runs the background no longer wants; checked between steps.
const cancelledRuns = new Set<string>();

export function cancelRun(runId: string): void {
  cancelledRuns.add(runId);
}

// The whole run. Throws AUTH_REQUIRED, RUN_FAILED, RUN_NOT_ACCEPTED,
// RUN_TIMEOUT, SCRAPE_FAILED or CANCELLED.
export async function runAudit(
  runId: string,
  custom?: CustomAuditRunRequest,
  timing = DEFAULT_TIMING,
): Promise<AuditRunOutcome> {
  try {
    // Both are read-only, so overlap them.
    const [before, form] = await Promise.all([
      fetchAuditHistoryRows(),
      fetchRunForm(custom),
    ]);
    const known = new Set(before.map((row) => row.key));

    assertNotCancelled(runId);
    const startedAt = Date.now();
    await submitForm(form);
    const { auditId, rows } = await waitForNewAudit(known, runId, timing);
    const generatedAt = Date.now();

    const result = await fetchAuditResults(auditId);
    if ("error" in result) throw new Error(result.error);
    const doneAt = Date.now();

    console.log(
      `Audit ${auditId} done in ${doneAt - startedAt} ms ` +
        `(generate ${generatedAt - startedAt} ms, scrape ${doneAt - generatedAt} ms) · ` +
        `${result.audit.requirements.length} requirements, ` +
        `${Object.keys(result.audit.courses).length} courses`,
    );
    return {
      auditId,
      audit: result.audit,
      history: toAuditHistoryEntries(rows),
    };
  } finally {
    // A cancel that lands after our last check must not linger.
    cancelledRuns.delete(runId);
  }
}

// ------------------------------------------------------------------- steps

// Fetches the run page and returns the form to post: the default-degree
// "Run Audit" form, or the custom one filled in from `custom`.
async function fetchRunForm(custom?: CustomAuditRunRequest): Promise<RunForm> {
  const url = custom
    ? `${RUN_PAGE_URL}?${new URLSearchParams({ catalog: custom.catalog, college: custom.college })}`
    : RUN_PAGE_URL;
  const page = await fetchPage(url);
  const form = custom
    ? fillCustomForm(page, custom)
    : page.querySelector(RUN_AUDIT_BUTTON_SELECTOR)?.closest("form");
  if (!form) throw new Error("RUN_FORM_NOT_FOUND");
  // A parsed page has no URL of its own, so resolve the action against the
  // one we fetched (the custom form's action is "").
  return { form, action: new URL(form.getAttribute("action") ?? "", url).href };
}

// The custom form's selects only populate when the page was fetched with
// catalog+college, which fetchRunForm does.
function fillCustomForm(
  page: Document,
  custom: CustomAuditRunRequest,
): HTMLFormElement | null {
  const form = page.querySelector<HTMLFormElement>("#single_request");
  if (!form) return null;
  setSelect(form, "degree_plan", custom.degreePlan);
  if (custom.minor) setSelect(form, "minor", custom.minor);
  if (custom.certificate) setSelect(form, "certificate", custom.certificate);
  setCheckbox(form, "current", custom.includeCurrent ?? true);
  setCheckbox(form, "future", custom.includeFuture ?? false);
  setCheckbox(form, "planned", custom.includePlanned ?? false);
  return form;
}

// GET + parse, with UT's login page turned into AUTH_REQUIRED.
async function fetchPage(url: string): Promise<Document> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("RUN_FAILED");
  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (isLoginPage(page)) throw new Error("AUTH_REQUIRED");
  return page;
}

// POSTs the form without following UT's redirect: the redirect itself is the
// "accepted" signal. A 200 means UT re-rendered the form and queued nothing.
async function submitForm({ form, action }: RunForm): Promise<void> {
  const body = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    body.append(key, String(value));
  }
  // FormData skips the submit button, which UT's views expect
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
  if (response.type === "opaqueredirect") return;

  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  throw new Error(isLoginPage(page) ? "AUTH_REQUIRED" : "RUN_FAILED");
}

// Polls history until our request shows up and finishes. Phase 1: a row whose
// key we did not know before the POST is ours. Phase 2: that row has a link.
async function waitForNewAudit(
  known: Set<string>,
  runId: string,
  timing: typeof DEFAULT_TIMING,
): Promise<{ auditId: string; rows: AuditHistoryRow[] }> {
  const startedAt = Date.now();
  let ourKey: string | undefined;

  while (
    Date.now() - startedAt <
    (ourKey === undefined ? timing.acceptWindowMs : timing.runWindowMs)
  ) {
    assertNotCancelled(runId);
    const rows = await fetchAuditHistoryRows();
    ourKey ??= rows.find((row) => !known.has(row.key))?.key;
    const ours = rows.find((row) => row.key === ourKey);
    if (ours?.auditId) return { auditId: ours.auditId, rows };
    await sleep(timing.pollIntervalMs);
  }
  throw new Error(ourKey === undefined ? "RUN_NOT_ACCEPTED" : "RUN_TIMEOUT");
}

// ------------------------------------------------------------------ helpers

function assertNotCancelled(runId: string): void {
  if (cancelledRuns.has(runId)) throw new Error("CANCELLED");
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
