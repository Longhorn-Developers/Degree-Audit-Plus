import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { submitDevUtLogin } from "../lib/dev-ut-login";

const credentials = { eid: "test-eid", password: "test-password" };
const markup = `<form method="post">
  <input name="j_username"><input name="j_password" type="password">
  <button name="_eventId_proceed" type="submit">Sign in</button>
</form>`;

function page(
  html = markup,
  url = "https://enterprise.login.utexas.edu/idp/profile/SAML2/Redirect/SSO",
) {
  const { window } = new JSDOM(html, { url });
  let submissions = 0;
  window.document.addEventListener("submit", (event) => {
    event.preventDefault();
    submissions++;
  });
  return {
    document: window.document,
    storage: window.sessionStorage,
    submissions: () => submissions,
  };
}

test("submits credentials once, preserving the UT submit button", () => {
  const p = page();
  const submitted: { name: string | null } = { name: null };
  p.document.addEventListener("submit", (event) => {
    submitted.name = (event.submitter as HTMLElement).getAttribute("name");
  });
  expect(submitDevUtLogin(p.document, p.storage, credentials)).toBe(true);
  expect(
    p.document.querySelector<HTMLInputElement>('[name="j_username"]')!.value,
  ).toBe(credentials.eid);
  expect(
    p.document.querySelector<HTMLInputElement>('[name="j_password"]')!.value,
  ).toBe(credentials.password);
  expect(submitted.name).toBe("_eventId_proceed");
  p.document.querySelector("form")!.reset();
  expect(submitDevUtLogin(p.document, p.storage, credentials)).toBe(false);
  expect(p.submissions()).toBe(1);
});

test("leaves Duo, other hosts, unsafe forms, and manual input alone", () => {
  for (const p of [
    page("<form><button>Send Duo push</button></form>"),
    page(markup, "https://example.com/idp/profile/login"),
    page(markup.replace('method="post"', 'method="get"')),
    page(
      markup.replace(
        'method="post"',
        'method="post" action="https://example.com/"',
      ),
    ),
    page(
      markup.replace(
        'name="j_username"',
        'name="j_username" value="manual-eid"',
      ),
    ),
  ]) {
    expect(submitDevUtLogin(p.document, p.storage, credentials)).toBe(false);
    expect(p.submissions()).toBe(0);
  }
});

test("does not submit without credentials or working attempt storage", () => {
  const p = page();
  expect(
    submitDevUtLogin(p.document, p.storage, { eid: "", password: "" }),
  ).toBe(false);
  expect(
    submitDevUtLogin(
      p.document,
      {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error("Storage disabled");
        },
      },
      credentials,
    ),
  ).toBe(false);
  expect(p.submissions()).toBe(0);
});
