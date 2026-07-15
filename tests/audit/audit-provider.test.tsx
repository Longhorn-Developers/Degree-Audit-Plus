import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fakeBrowser } from "wxt/testing/fake-browser";

mock.module("wxt/browser", () => ({ browser: fakeBrowser }));
mock.module("@wxt-dev/browser", () => ({ browser: fakeBrowser }));

const { default: AuditContextProvider } =
  await import("../../features/degree-audit-app/providers/audit-provider");
const { PreferencesProvider } =
  await import("../../features/degree-audit-app/providers/preferences-provider");

let dom: JSDOM;
let root: Root;

beforeEach(async () => {
  fakeBrowser.reset();
  await fakeBrowser.storage.local.set({
    auditHistory: {
      audits: [{ auditId: "failed-audit", title: "Failed Audit" }],
      timestamp: 1,
    },
  });

  dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.com/degree-audit.html?auditId=failed-audit",
  });
  Object.defineProperty(dom.window, "matchMedia", {
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  root = createRoot(document.getElementById("root")!);
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
});

test("renders children when the selected audit has no cached data", async () => {
  await act(async () => {
    root.render(
      createElement(
        PreferencesProvider,
        null,
        createElement(
          AuditContextProvider,
          null,
          createElement("div", { "data-testid": "audit-shell" }),
        ),
      ),
    );
    await Bun.sleep(10);
  });

  expect(document.querySelector('[data-testid="audit-shell"]')).not.toBeNull();
});
