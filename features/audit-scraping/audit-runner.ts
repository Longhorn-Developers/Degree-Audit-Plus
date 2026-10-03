// Submits audit runs and deletes to UT via authenticated same-origin fetches.
// Runs in a content script on a UT page — the only context whose origin passes
// UT's CSRF checks (extension-origin POSTs get 403).
import type { CustomAuditRunRequest } from "@/domain/audit";
import { deleteAuditData } from "@/features/audit/audit-storage";
import { isLoginPage } from "@/features/session/session";
import { findMergedAuditIds, parseAuditHistory } from "./audit-history-parser";
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
  const page = await fetchPage(RUN_PAGE_URL, "RUN_FAILED");
  const form = page.querySelector(RUN_AUDIT_BUTTON_SELECTOR)?.closest("form");
  if (!form) throw new Error("RUN_BUTTON_NOT_FOUND");

  // Resolve the form's action against the fetched page, not the current one —
  // DOMParser documents inherit the creating page's base URL.
  const target = new URL(form.getAttribute("action") ?? "", RUN_PAGE_URL);
  await submitForm(form, target.toString());
}

async function submitCustomAudit(
  options: CustomAuditRunRequest,
): Promise<void> {
  const query = new URLSearchParams({
    catalog: options.catalog,
    college: options.college,
  });
  const page = await fetchPage(`${RUN_PAGE_URL}?${query}`, "RUN_FAILED");
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
  const page = await fetchPage(AUDIT_HISTORY_URL, "DELETE_FAILED");
  const auditIds = findMergedAuditIds(page, auditId);

  for (const id of auditIds) {
    const form = findDeleteForm(page, id);
    if (!form) throw new Error("DELETE_FORM_NOT_FOUND");

    // ut posts deletes to /requests/history/ not the page we fetched
    const target = new URL(
      form.getAttribute("action") ?? "",
      AUDIT_HISTORY_URL,
    );
    const response = await fetch(target.toString(), {
      method: "POST",
      credentials: "include",
      body: getFormBody(form),
    });
    if (!response.ok) throw new Error("DELETE_FAILED");
  }
  // already gone on ut so only the local copy needs clearing
  if (!auditIds.length) auditIds.push(auditId);

  const updatedPage = await fetchPage(AUDIT_HISTORY_URL, "DELETE_FAILED");
  // ut drops the table once the last audit is gone
  const audits = updatedPage.querySelector("table")
    ? parseAuditHistory(updatedPage)
    : [];

  const remainingIds: string[] = [];
  const deletedIds: string[] = [];
  for (const id of auditIds) {
    if (findDeleteForm(updatedPage, id)) {
      remainingIds.push(id);
    } else {
      deletedIds.push(id);
    }
  }
  await deleteAuditData(deletedIds);
  await processAuditHistory(audits);

  if (remainingIds.length) throw new Error("DELETE_FAILED");
}

function findDeleteForm(page: Document, auditId: string) {
  const input = page.querySelector(
    `input[name="audit_to_delete"][value="${auditId}"]`,
  );
  return input?.closest("form") ?? null;
}

async function fetchPage(url: string, failure: string): Promise<Document> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(failure);

  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  if (isLoginPage(page)) throw new Error("AUTH_REQUIRED");
  return page;
}

async function submitForm(
  form: HTMLFormElement,
  targetUrl: string,
): Promise<void> {
  const response = await fetch(targetUrl, {
    method: "POST",
    credentials: "include",
    body: getFormBody(form),
  });
  // A successful submission 302s to the request-history page.
  if (response.ok && response.redirected && response.url.includes("/history/"))
    return;

  const page = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  throw new Error(isLoginPage(page) ? "AUTH_REQUIRED" : "RUN_FAILED");
}

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
