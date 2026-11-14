const LOGIN_ORIGIN = "https://enterprise.login.utexas.edu";
const ATTEMPT_KEY = "dap-dev-ut-login-attempted";

export function submitDevUtLogin(
  document: Document,
  storage: Pick<Storage, "getItem" | "setItem">,
  credentials: { eid: string; password: string },
): boolean {
  const url = new URL(document.URL);
  if (url.origin !== LOGIN_ORIGIN || !url.pathname.startsWith("/idp/profile/"))
    return false;
  if (!credentials.eid || !credentials.password) return false;

  const password = document.querySelector<HTMLInputElement>(
    'input[name="j_password"][type="password"]',
  );
  const form = password?.form;
  const username = form?.querySelector<HTMLInputElement>(
    'input[name="j_username"]',
  );
  const submit = form?.querySelector<HTMLButtonElement | HTMLInputElement>(
    '[name="_eventId_proceed"]',
  );
  if (!form || !username || !password || !submit || submit.disabled)
    return false;
  if (
    form.method.toLowerCase() !== "post" ||
    new URL(form.action).origin !== LOGIN_ORIGIN
  )
    return false;
  if (username.value || password.value) return false;

  try {
    if (storage.getItem(ATTEMPT_KEY)) return false;
    storage.setItem(ATTEMPT_KEY, "1");
  } catch {
    return false;
  }

  for (const [input, value] of [
    [username, credentials.eid],
    [password, credentials.password],
  ] as const) {
    input.value = value;
    const Event = document.defaultView!.Event;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  form.requestSubmit(submit);
  return true;
}
