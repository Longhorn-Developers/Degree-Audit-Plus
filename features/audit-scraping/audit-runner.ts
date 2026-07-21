// Submits audit runs to UT via authenticated same-origin fetches. Runs in a
// content script on a UT page — the only context whose origin passes UT's
// CSRF checks (extension-origin POSTs get 403).
import type { CustomAuditRunRequest } from "@/domain/audit";
import { isLoginPage } from "@/features/session/session";
import {
  markAuditRunPending,
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
  const page = await fetchRunPage();
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
  const page = await fetchRunPage(`?${query}`);
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

async function submitForm(
  form: HTMLFormElement,
  targetUrl: string,
): Promise<void> {
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

  const response = await fetch(targetUrl, {
    method: "POST",
    credentials: "include",
    body,
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
