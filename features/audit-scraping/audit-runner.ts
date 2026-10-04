// Submits audit runs and deletes to UT via authenticated same-origin fetches.
// Runs in a content script on a UT page — the only context whose origin passes
// UT's CSRF checks (extension-origin POSTs get 403).
import type { CustomAuditRunRequest } from "@/domain/audit";
import { deleteAuditData } from "@/features/audit/audit-storage";
import { fetchUtPage } from "@/features/session/session";
import { findDedupedAuditIds, parseAuditHistory } from "./audit-history-parser";
import {
  AUDIT_HISTORY_URL,
  markAuditRunPending,
  processAuditHistory,
  RUN_AUDIT_BUTTON_SELECTOR,
} from "./audit-history-sync";

const RUN_PAGE_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

// The individual-audit form; its selects populate only when the page is
// fetched with catalog+college query parameters.
const CUSTOM_FORM_SELECTOR = "#single_request";

// Runs the user's default profile audit, or a custom one when options are
// given. Marks successful submissions pending so history polling finds them.
export async function runAudit(custom?: CustomAuditRunRequest): Promise<void> {
  if (custom) {
    await submitCustomAudit(custom);
  } else {
    await submitDefaultAudit();
  }
  await markAuditRunPending();
}

async function submitDefaultAudit(): Promise<void> {
  const { page } = await fetchUtPage(RUN_PAGE_URL);
  const form = page.querySelector(RUN_AUDIT_BUTTON_SELECTOR)?.closest("form");
  if (!form) throw new Error("RUN_BUTTON_NOT_FOUND");

  await submitForm(form, RUN_PAGE_URL);
}

async function submitCustomAudit(
  options: CustomAuditRunRequest,
): Promise<void> {
  const query = new URLSearchParams({
    catalog: options.catalog,
    college: options.college,
  });
  const { page } = await fetchUtPage(`${RUN_PAGE_URL}?${query}`);
  const form = page.querySelector<HTMLFormElement>(CUSTOM_FORM_SELECTOR);
  if (!form) throw new Error("RUN_FORM_NOT_FOUND");

  setSelect(form, "degree_plan", options.degreePlan);
  if (options.minor) setSelect(form, "minor", options.minor);
  if (options.certificate) setSelect(form, "certificate", options.certificate);
  setCheckbox(form, "current", options.includeCurrent ?? true);
  setCheckbox(form, "future", options.includeFuture ?? false);
  setCheckbox(form, "planned", options.includePlanned ?? false);

  // The form posts to its own parameterized URL (action="").
  await submitForm(form, `${RUN_PAGE_URL}?${query}`);
}

// Deletes the audit on UT along with every rerun the dashboard folds into the
// same card, then syncs the cache to whatever UT's history shows afterwards.
export async function deleteAudit(auditId: string): Promise<void> {
  const { page } = await fetchUtPage(AUDIT_HISTORY_URL);
  const auditIds = findDedupedAuditIds(page, auditId);
  for (const id of auditIds) {
    const form = findDeleteForm(page, id);
    if (!form) throw new Error("DELETE_FORM_NOT_FOUND");
    await submitForm(form, AUDIT_HISTORY_URL);
  }

  const { page: updatedPage } = await fetchUtPage(AUDIT_HISTORY_URL);
  const isGone = (id: string) => !findDeleteForm(updatedPage, id);
  // history first so the dashboard moves off the card before its data goes;
  // auditId covers a card already deleted on UT but still cached here
  await processAuditHistory(parseAuditHistory(updatedPage));
  await deleteAuditData([auditId, ...auditIds].filter(isGone));

  if (!auditIds.every(isGone)) throw new Error("DELETE_FAILED");
}

// UT's delete form for one history row, or null once the row is gone.
function findDeleteForm(page: Document, auditId: string) {
  const input = page.querySelector(
    `input[name="audit_to_delete"][value="${auditId}"]`,
  );
  return input?.closest("form") ?? null;
}

// Posts a UT form fetched from pageUrl. UT answers a successful run or delete
// with its history page.
async function submitForm(form: HTMLFormElement, pageUrl: string) {
  // Resolve the action against the fetched page, not the current one —
  // DOMParser documents inherit the creating page's base URL.
  const target = new URL(form.getAttribute("action") ?? "", pageUrl);
  const { url } = await fetchUtPage(target.toString(), {
    method: "POST",
    body: getFormBody(form),
  });
  if (!url.includes("/history/")) throw new Error("SUBMIT_FAILED");
}

function getFormBody(form: HTMLFormElement): URLSearchParams {
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
  return body;
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
