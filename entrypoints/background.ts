export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // Listen for extension icon click - send message to toggle popup in content script
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      try {
        await browser.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" });
      } catch (error) {
        console.log("Content script not ready, injecting...", error);
      }
    }
  });

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openDegreeAudit") {
      const url = browser.runtime.getURL(
        `/degree-audit.html&${message.auditId}`
      );
      browser.tabs
        .create({ url })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open for async response
    }
  });

  // scrape audit data

  const scraperTabs = new Map<number, NodeJS.Timeout>();

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCRAPE_AUDIT") {
      // Create a hidden tab to scrape the audit
      browser.tabs.create({ url: message.url, active: false }, (tab) => {
        if (!tab?.id) {
          sendResponse({ status: "error", message: "Failed to create tab" });
          return;
        }

        const tabId = tab.id;

        // Safety timeout: auto-close tab after 30 seconds if not already closed
        const safetyTimeout = setTimeout(() => {
          console.log("Safety timeout: closing scraper tab", tabId);
          browser.tabs.remove(tabId).catch(() => {});
          scraperTabs.delete(tabId);
        }, 30000);

        scraperTabs.set(tabId, safetyTimeout);

        // Listen for when the tab finishes loading
        const updateListener = (id: number, changeInfo: any) => {
          if (id === tabId && changeInfo.status === "complete") {
            // Clean up listeners
            browser.tabs.onUpdated.removeListener(updateListener);
            browser.tabs.onRemoved.removeListener(removeListener);
            browser.tabs
              .sendMessage(tabId, { type: "RUN_SCRAPER" })
              .catch((err) => {
                console.error("Failed to send scraper message:", err);
                browser.tabs.remove(tabId);
                const timeout = scraperTabs.get(tabId);
                if (timeout) clearTimeout(timeout);
                scraperTabs.delete(tabId);
              });
          }
        };
        const removeListener = (closedTabId: number) => {
          if (closedTabId === tabId) {
            console.log("Scraper tab was closed before completion");
            browser.tabs.onUpdated.removeListener(updateListener);
            browser.tabs.onRemoved.removeListener(removeListener);
            const timeout = scraperTabs.get(tabId);
            if (timeout) clearTimeout(timeout);
            scraperTabs.delete(tabId);
          }
        };
        browser.tabs.onUpdated.addListener(updateListener);
        browser.tabs.onRemoved.addListener(removeListener);
        sendResponse({ status: "started", tabId });
      });
      // Keep message channel open for async response
      return true;
    }

    // Listen for audit results from scraper tab and close it
    if (message.type === "AUDIT_RESULTS") {
      const tabId = sender.tab?.id;
      if (tabId) {
        console.log("Received audit results, closing scraper tab:", tabId);

        // Clear safety timeout
        const timeout = scraperTabs.get(tabId);
        if (timeout) clearTimeout(timeout);
        scraperTabs.delete(tabId);

        // Close the scraper tab
        browser.tabs.remove(tabId).catch((err) => {
          console.error("Failed to close scraper tab:", err);
        });
      }
      // Don't send response
      return false;
    }
  });
});
