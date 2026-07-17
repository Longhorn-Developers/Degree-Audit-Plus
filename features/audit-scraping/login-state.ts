import { storage } from "wxt/utils/storage";
import { checkLoginRequired } from "./audit-page-parser";

// Single owner of UT Direct login state: a cached value for instant UI, a
// live probe for truth, and event-driven writers that keep the cache fresh.
// Callers never touch the storage key, probe URL, or cookie details directly.

const AUDIT_HOME_URL = "https://utdirect.utexas.edu/apps/degree/audits/";

// Any authenticated UT Direct endpoint works as a probe; the history page is
// lightweight and already part of the audit flow.
const LOGIN_PROBE_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/history/";

// UT Direct's degree-audit session cookie. Its removal is a definitive
// logged-out signal; its appearance is only a hint (server-side expiry can
// leave a dead cookie behind), so a set event triggers a verify instead.
const SESSION_COOKIE = "sessionid-degree-audits-production";

// Last-known login state. null = never determined (fresh install).
// Kept in local: storage — login state is per-browser and must not sync.
const createLoginStateItem = () =>
  storage.defineItem<boolean | null>("local:utdLoggedIn", {
    defaultValue: null,
  });
let loginStateItem: ReturnType<typeof createLoginStateItem> | undefined;

function getLoginStateItem() {
  // Avoid touching extension storage when consumers only import this module.
  return (loginStateItem ??= createLoginStateItem());
}

function saveLoginState(loggedIn: boolean): Promise<void> {
  return getLoginStateItem().setValue(loggedIn);
}

// Live network check. Logged out → UT SSO redirects the request to the login
// page, so a followed redirect (or any failure) means no valid session.
async function isLoggedIn(): Promise<boolean> {
  try {
    const response = await fetch(LOGIN_PROBE_URL, { credentials: "include" });
    return response.ok && !response.redirected;
  } catch {
    return false;
  }
}

// Instant, possibly-stale read for painting UI. Verify with
// refreshLoginState() before actions that depend on being logged in.
export function getCachedLoginState(): Promise<boolean | null> {
  return getLoginStateItem().getValue();
}

export function watchLoginState(
  listener: (loggedIn: boolean | null) => void,
): () => void {
  return getLoginStateItem().watch(listener);
}

// Definitive check that also updates the cache.
export async function refreshLoginState(): Promise<boolean> {
  const loggedIn = await isLoggedIn();
  await saveLoginState(loggedIn);
  return loggedIn;
}

// Content-script writer. A real UT Direct page is a definitive signal:
// a login form in the DOM means the session is gone.
export function recordLoginStateFromPage(document: Document): void {
  void saveLoginState(!checkLoginRequired(document));
}

// Event-driven cache updates from the background service worker: react the
// moment the session cookie is removed or (re)created, instead of waiting for
// the next popup open. Requires the "cookies" permission.
export function registerSessionCookieWatcher(): void {
  if (!browser.cookies?.onChanged) return;

  browser.cookies.onChanged.addListener(({ cookie, removed, cause }) => {
    if (cookie.name !== SESSION_COOKIE) return;
    if (removed) {
      // "overwrite" removals are immediately followed by a set event for the
      // replacement cookie — not a logout.
      if (cause !== "overwrite") void saveLoginState(false);
    } else {
      void refreshLoginState();
    }
  });
}

// The one way to send a user to log in. The audit home doubles as the SSO
// entry point and, after the redirect back, triggers the first history sync.
export async function openLoginTab(): Promise<void> {
  await browser.tabs.create({ url: AUDIT_HOME_URL, active: true });
}
