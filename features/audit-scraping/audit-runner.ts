// Runs and deletes audits inside a UT tab. A run submits the form, waits for
// our row in the history table, and scrapes the result. It lives in the tab
// because the tab has the UT cookies, passes CSRF, and has a DOMParser.
import type {
  AuditDegree,
  AuditHistoryEntry,
  CustomAuditRunRequest,
} from "@/domain/audit";
import {
  PlannerError,
  type PlannedCourseRow,
  type PlannerErrorCode,
  type PlannerRowKey,
  type PlannerSyncTarget,
} from "@/domain/course";
import {
  deleteAuditData,
  getPendingPreview,
  saveAuditData,
  savePendingPreview,
} from "@/features/audit/audit-storage";
import { fetchUtPage, isLoginPage } from "@/features/session/session";
import type { AuditRunOutcome, AuditRunRequest } from "@/lib/browser/messages";
import {
  findCardId,
  findDedupedAuditIds,
  findNewRowKey,
  parseAuditHistory,
  parseAuditHistoryRows,
  toAuditHistoryEntries,
  type AuditHistoryRow,
} from "./audit-history-parser";
import {
  AUDIT_HISTORY_URL,
  fetchAuditHistoryRows,
  fetchAuditResults,
  processAuditHistory,
  RUN_AUDIT_BUTTON_SELECTOR,
} from "./audit-history-sync";
import {
  addCourse,
  deleteCourse,
  fetchPlannedCourses,
  resolveCourse,
} from "./planner-client";

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

// The whole run. A `preview` run's audit stays on UT, hidden from the app as
// the pending preview, so Add to plan can show it without running again; the
// next run drops it. Throws AUTH_REQUIRED, RUN_FAILED, RUN_NOT_ACCEPTED,
// RUN_TIMEOUT, SCRAPE_FAILED, DELETE_FAILED, CANCELLED or a planner code.
export async function runAudit(
  runId: string,
  { custom, degree, preview, remove = [], replaces }: AuditRunRequest = {},
  timing = DEFAULT_TIMING,
): Promise<AuditRunOutcome> {
  const { steps, mark } = stopwatch();
  try {
    const afterDrop = await dropPendingPreview();
    mark("drop last preview");
    for (const key of remove) await deleteRowIfThere(key);
    if (preview) await planPreview(preview);
    mark("planner");

    // Both are read-only, so overlap them. Dropping a preview audit already
    // got the history back.
    const [before, form] = await Promise.all([
      afterDrop ?? fetchAuditHistoryRows(),
      fetchRunForm(custom),
    ]);
    mark("read history + form");

    assertNotCancelled(runId);
    await submitForm(form, !custom, degree);
    mark("submit");
    // a preview sees its audit through even when cancelled, so the next run
    // knows which audit to drop
    const { auditId, rows, page } = await waitForNewAudit(
      before,
      preview ? null : runId,
      timing,
    );
    if (preview) await savePreviewAuditId(auditId);
    mark("UT generates audit");

    assertNotCancelled(runId);
    const result = await fetchAuditResults(auditId);
    if ("error" in result) throw new Error(result.error);
    // kept under its own id, out of the history, until it's added to the plan
    if (preview) await saveAuditData(auditId, result.audit);
    mark("scrape");

    const cardId = findCardId(rows, auditId);
    const history = await deleteReplacedAudit(rows, page, replaces, cardId);
    if (history !== rows) mark("delete old plan audit");

    console.log(
      `Audit ${auditId} done · ${result.audit.requirements.length} requirements, ` +
        `${Object.keys(result.audit.courses).length} courses · ms per step:`,
      steps,
    );
    return {
      auditId,
      cardId,
      percentage: rows.find((row) => row.auditId === auditId)?.percentage ?? 0,
      audit: result.audit,
      history: toAuditHistoryEntries(history),
      steps,
    };
  } finally {
    // A cancel that lands after our last check must not linger.
    cancelledRuns.delete(runId);
  }
}

// ------------------------------------------------------------------- steps

// Add to plan: the pending preview's audit becomes a card. Nothing runs
// again; this only reads UT's history and drops the old plan audit.
export async function promotePreview(
  auditId: string,
  replaces?: string,
): Promise<{ cardId: string; history: AuditHistoryEntry[] }> {
  const { page } = await fetchUtPage(AUDIT_HISTORY_URL);
  const rows = parseAuditHistoryRows(page);
  if (!rows.some((row) => row.auditId === auditId)) {
    throw new Error("NO_PREVIEW");
  }
  const cardId = findCardId(rows, auditId);
  const history = await deleteReplacedAudit(rows, page, replaces, cardId);
  return { cardId, history: toAuditHistoryEntries(history) };
}

// Deletes the degree's previous plan audit once a new one is in, and returns
// the history after. A new audit that folds into that audit's card keeps it.
async function deleteReplacedAudit(
  rows: AuditHistoryRow[],
  page: Document,
  replaces: string | undefined,
  cardId: string,
): Promise<AuditHistoryRow[]> {
  if (
    !replaces ||
    replaces === cardId ||
    !rows.some((row) => row.auditId === replaces)
  ) {
    return rows;
  }
  try {
    const history = await deleteAuditRow(replaces, page);
    await deleteAuditData([replaces]);
    return history;
  } catch (error) {
    // the new audit is in, a leftover one is only clutter
    console.error(`Failed to delete replaced audit ${replaces}:`, error);
    return rows;
  }
}

async function planPreview(course: PlannerSyncTarget): Promise<void> {
  const resolution = await resolveCourse(course);
  const link =
    resolution.kind === "resolved"
      ? resolution.link
      : resolution.options.find(({ topicId }) => topicId === course.topicId);
  if (!link) throw new PlannerError("TOPIC_REQUIRED");

  try {
    const row = await addCourse(link);
    await savePendingPreview({ course, row: row.key, auditId: null });
  } catch (error) {
    if (!hasPlannerCode(error, "DUPLICATE_ROW")) throw error;
    await savePendingPreview({ course, row: null, auditId: null });
  }
}

async function savePreviewAuditId(auditId: string): Promise<void> {
  const pending = await getPendingPreview();
  if (pending) await savePendingPreview({ ...pending, auditId });
}

// Undoes the last preview that wasn't added to the plan: its planner course
// and its audit. Returns UT's history after, if it had to read it.
async function dropPendingPreview(): Promise<AuditHistoryRow[] | null> {
  const pending = await getPendingPreview();
  if (!pending) return null;
  if (pending.row) await deleteRowIfThere(pending.row);
  let rows: AuditHistoryRow[] | null = null;
  if (pending.auditId) {
    const { page } = await fetchUtPage(AUDIT_HISTORY_URL);
    rows = findDeleteForm(page, pending.auditId)
      ? await deleteAuditRow(pending.auditId, page)
      : parseAuditHistoryRows(page);
    await deleteAuditData([pending.auditId]);
  }
  await savePendingPreview(null);
  return rows;
}

export async function readPlanner(): Promise<PlannedCourseRow[]> {
  await dropPendingPreview();
  return fetchPlannedCourses();
}

async function deleteRowIfThere(key: PlannerRowKey): Promise<void> {
  try {
    await deleteCourse(key);
  } catch (error) {
    if (!hasPlannerCode(error, "ROW_NOT_FOUND")) throw error;
  }
}

// Fetches the run page and returns the form to post: the default-degree
// "Run Audit" form, or the custom one filled in from `custom`.
async function fetchRunForm(custom?: CustomAuditRunRequest): Promise<RunForm> {
  const url = custom
    ? `${RUN_PAGE_URL}?${new URLSearchParams({ catalog: custom.catalog, college: custom.college })}`
    : RUN_PAGE_URL;
  const { page } = await fetchUtPage(url);
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

// POSTs the form without following UT's redirect: the redirect itself is the
// "accepted" signal. A 200 means UT re-rendered the form and queued nothing.
async function submitForm(
  { form, action }: RunForm,
  includePlanned: boolean,
  degree?: AuditDegree,
): Promise<void> {
  const body = getFormBody(form);
  // A hidden field on the default form; UT's default is " " (leave out).
  if (includePlanned) body.set("incl_planned_crswk", "Y");
  // The default form runs whatever degree plan its hidden fields name. UT's
  // catalog field is a term and picks the catalog that term falls in, so fall
  // of the catalog's first year picks that catalog.
  if (degree) {
    body.set("degree_plan", degree.degreePlan);
    body.set("catalog", `${degree.catalogYear}9`);
  }

  // The one UT request that skips fetchUtPage: it must not follow the redirect.
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

// Polls history until our request shows up and finishes. Phase 1: a row that
// wasn't there before the POST is ours. Phase 2: that row has a link. UT lists
// newest first, so with a repeated key the first row is ours.
async function waitForNewAudit(
  before: AuditHistoryRow[],
  runId: string | null,
  timing: typeof DEFAULT_TIMING,
): Promise<{ auditId: string; rows: AuditHistoryRow[]; page: Document }> {
  const startedAt = Date.now();
  let ourKey: string | undefined;

  while (
    Date.now() - startedAt <
    (ourKey === undefined ? timing.acceptWindowMs : timing.runWindowMs)
  ) {
    if (runId) assertNotCancelled(runId);
    const { page } = await fetchUtPage(AUDIT_HISTORY_URL);
    const rows = parseAuditHistoryRows(page);
    ourKey ??= findNewRowKey(before, rows);
    const ours = rows.find((row) => row.key === ourKey);
    if (ours?.auditId) return { auditId: ours.auditId, rows, page };
    await sleep(timing.pollIntervalMs);
  }
  throw new Error(ourKey === undefined ? "RUN_NOT_ACCEPTED" : "RUN_TIMEOUT");
}

// ------------------------------------------------------------------ delete

// Deletes the audit on UT along with every rerun the dashboard folds into the
// same card, then syncs the cache to whatever UT's history shows afterwards.
export async function deleteAudit(auditId: string): Promise<void> {
  const { page } = await fetchUtPage(AUDIT_HISTORY_URL);
  const auditIds = findDedupedAuditIds(page, auditId);
  for (const id of auditIds) {
    await postDeleteForm(page, id);
  }

  const { page: updatedPage } = await fetchUtPage(AUDIT_HISTORY_URL);
  const isGone = (id: string) => !findDeleteForm(updatedPage, id);
  // history first so the dashboard moves off the card before its data goes;
  // auditId covers a card already deleted on UT but still cached here
  await processAuditHistory(parseAuditHistory(updatedPage));
  await deleteAuditData([auditId, ...auditIds].filter(isGone));

  if (!auditIds.every(isGone)) throw new Error("DELETE_FAILED");
}

// Deletes just this one history row on UT, none of the reruns on its card.
// `page` is a history page that still has the row.
async function deleteAuditRow(
  auditId: string,
  page: Document,
): Promise<AuditHistoryRow[]> {
  const response = await postDeleteForm(page, auditId);
  const isHistory =
    new URL(response.url).pathname === "/apps/degree/audits/requests/history/";
  if (!isHistory || findDeleteForm(response.page, auditId)) {
    throw new Error("DELETE_FAILED");
  }
  return parseAuditHistoryRows(response.page);
}

async function postDeleteForm(
  page: Document,
  auditId: string,
): Promise<{ page: Document; url: string }> {
  const form = findDeleteForm(page, auditId);
  if (!form) throw new Error("DELETE_FORM_NOT_FOUND");
  // a parsed page has no URL of its own, so resolve against the one fetched
  const action = new URL(form.getAttribute("action") ?? "", AUDIT_HISTORY_URL);
  return fetchUtPage(action.href, { method: "POST", body: getFormBody(form) });
}

// UT's delete form for one history row, or null once the row is gone.
function findDeleteForm(page: Document, auditId: string) {
  const input = page.querySelector(
    `input[name="audit_to_delete"][value="${auditId}"]`,
  );
  return input?.closest("form") ?? null;
}

// ------------------------------------------------------------------ helpers

// A form's fields as a POST body. FormData skips the submit button, which UT's
// views expect (e.g. audit="Submit Audit").
function getFormBody(form: HTMLFormElement): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    body.append(key, String(value));
  }
  const submit = form.querySelector<HTMLInputElement | HTMLButtonElement>(
    '[type="submit"]',
  );
  if (submit?.name) body.append(submit.name, submit.value);
  return body;
}

// ms per step: mark(step) closes the step that just ran.
function stopwatch() {
  const steps: Record<string, number> = {};
  let lap = Date.now();
  const mark = (step: string) => {
    steps[step] = Date.now() - lap;
    lap = Date.now();
  };
  return { steps, mark };
}

function hasPlannerCode(error: unknown, code: PlannerErrorCode): boolean {
  return error instanceof PlannerError && error.code === code;
}

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
