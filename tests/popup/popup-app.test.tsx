import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fakeBrowser } from "wxt/testing/fake-browser";

mock.module("wxt/browser", () => ({ browser: fakeBrowser }));
mock.module("@wxt-dev/browser", () => ({ browser: fakeBrowser }));

const { default: PopupApp } = await import("../../features/popup/popup-app");

let dom: JSDOM;
let root: Root;

beforeEach(async () => {
  fakeBrowser.reset();

  dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.com/popup-app.html",
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

test("shows login guidance when no audits are cached", async () => {
  // given
  await fakeBrowser.storage.local.set({
    auditHistory: { audits: [], timestamp: 1 },
  });

  // when
  await act(async () => {
    root.render(createElement(PopupApp));
  });

  // then
  expect(document.body.textContent).toContain("Login");
  expect(document.body.textContent).toContain(
    "Log in to UT Direct, then visit the Degree Audit page",
  );
});
