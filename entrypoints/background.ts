import { browser } from "wxt/browser";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "open-dap") {
      const url = browser.runtime.getURL("degree-audit.html" as any);
      browser.tabs.create({ url });
    }
  });
});
