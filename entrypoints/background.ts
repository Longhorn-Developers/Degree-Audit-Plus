import { saveAuditData } from "@/lib/storage";
import {
  getOrCreateScraperWindow,
  closeScraperWindow,
} from "@/lib/scraper-window";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // extension clicking for rounded corners

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
        `/degree-audit.html?auditId=${message.auditId}`
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

  // Scrape a single audit by ID
  // Creates a tab in the minimized scraper window, waits for load, sends RUN_SCRAPER message
  // Resolution happens via pendingScrapes map when AUDIT_RESULTS is received
  async function scrapeAuditById(auditId: string): Promise<void> {
    const url = `https://utdirect.utexas.edu/apps/degree/audits/results/${auditId}/`;
    console.log(`[Batch Scraper] Starting scrape for audit: ${auditId}`);

    // Get or create the minimized scraper window
    const windowId = await getOrCreateScraperWindow();

    return new Promise((_resolve, reject) => {
      browser.tabs.create({ url, active: false, windowId }, (tab) => {
        if (!tab?.id) {
          console.error(
            `[Batch Scraper] Failed to create tab for audit: ${auditId}`
          );
          reject(new Error("Failed to create tab"));
          return;
        }

        const tabId = tab.id;
        console.log(
          `[Batch Scraper] Created hidden tab ${tabId} for audit: ${auditId}`
        );

        // Safety timeout: auto-close tab after 30 seconds
        const safetyTimeout = setTimeout(() => {
          console.log(
            `[Batch Scraper] Timeout for audit ${auditId}, closing tab ${tabId}`
          );
          cleanup();
          browser.tabs.remove(tabId).catch(() => {});
          reject(new Error("Timeout: Page did not load within 30 seconds"));
        }, 30000);

        scraperTabs.set(tabId, safetyTimeout);

        const cleanup = () => {
          browser.tabs.onUpdated.removeListener(updateListener);
          browser.tabs.onRemoved.removeListener(removeListener);
          const timeout = scraperTabs.get(tabId);
          if (timeout) clearTimeout(timeout);
          scraperTabs.delete(tabId);
        };

        // Listen for when the tab finishes loading
        const updateListener = (id: number, changeInfo: any) => {
          if (id === tabId && changeInfo.status === "complete") {
            console.log(
              `[Batch Scraper] Tab ${tabId} loaded, sending RUN_SCRAPER for audit: ${auditId}`
            );
            cleanup();
            browser.tabs
              .sendMessage(tabId, { type: "RUN_SCRAPER", auditId })
              .catch((err) => {
                console.error(
                  `[Batch Scraper] Failed to send scraper message for ${auditId}:`,
                  err
                );
                browser.tabs.remove(tabId).catch(() => {});
                reject(err);
              });
          }
        };

        const removeListener = (closedTabId: number) => {
          if (closedTabId === tabId) {
            console.log(
              `[Batch Scraper] Tab ${tabId} closed before completion for audit ${auditId}`
            );
            cleanup();
            reject(new Error("Tab closed before scraping completed"));
          }
        };

        browser.tabs.onUpdated.addListener(updateListener);
        browser.tabs.onRemoved.addListener(removeListener);
      });
    });
  }

  const pendingScrapes = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void }
  >();

  let isBatchScraping = false;

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_SYNC_STATUS") {
      sendResponse({ isSyncing: isBatchScraping });
      return true;
    }

    // Handle batch scraping reqz
    if (message.type === "SCRAPE_ALL_AUDITS") {
      const auditIds = message.auditIds as string[];
      console.log(
        `[Batch Scraper] Starting batch scrape for ${auditIds.length} audits:`,
        auditIds
      );

      // Mark scraping as in progress
      isBatchScraping = true;

      // Broadcast to all tabs (content scripts) and extension pages
      browser.tabs.query({}).then((tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            browser.tabs
              .sendMessage(tab.id, { type: "SCRAPE_ALL_STARTED" })
              .catch(() => {});
          }
        }
      });
      browser.runtime.sendMessage({ type: "SCRAPE_ALL_STARTED" }).catch(() => {});

      (async () => {
        const succeeded: string[] = [];
        const failed: string[] = [];

        for (const auditId of auditIds) {
          try {
            // Create a promise that will be resolved when AUDIT_RESULTS is received
            const scrapePromise = new Promise<void>((resolve, reject) => {
              pendingScrapes.set(auditId, { resolve, reject });

              // Start the scrape
              scrapeAuditById(auditId).catch(reject);
            });

            await Promise.race([
              scrapePromise,
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error("Scrape timeout")), 35000)
              ),
            ]);

            console.log(
              `[Batch Scraper] Successfully scraped audit: ${auditId}`
            );
            succeeded.push(auditId);
          } catch (e) {
            console.error(
              `[Batch Scraper] Failed to scrape audit ${auditId}:`,
              e
            );
            failed.push(auditId);
          } finally {
            pendingScrapes.delete(auditId);
          }
          // delay to nto overhwelm serv
          await new Promise((r) => setTimeout(r, 500));
        }

        console.log(
          `[Batch Scraper] Complete. Succeeded: ${succeeded.length}, Failed: ${failed.length}`
        );

        // Close the minimized scraper window
        await closeScraperWindow();

        // Mark scraping as done
        isBatchScraping = false;

        // Broadcast to all tabs (content scripts) and extension pages
        browser.tabs.query({}).then((tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              browser.tabs
                .sendMessage(tab.id, { type: "SCRAPE_ALL_COMPLETE" })
                .catch(() => {});
            }
          }
        });
        browser.runtime
          .sendMessage({ type: "SCRAPE_ALL_COMPLETE" })
          .catch(() => {});
      })();

      sendResponse({ status: "started" });
      return true;
    }

    // Handle single audit scrape (backward compat)
    if (message.type === "SCRAPE_AUDIT") {
      // Create a tab in the minimized scraper window
      (async () => {
        const windowId = await getOrCreateScraperWindow();
        browser.tabs.create(
          { url: message.url, active: false, windowId },
          (tab) => {
            if (!tab?.id) {
              sendResponse({
                status: "error",
                message: "Failed to create tab",
              });
              return;
            }

            const tabId = tab.id;
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
          }
        );
      })();
      // Keep message channel open for async response
      return true;
    }

    // Listen for audit results from scraper tab and close it
    if (message.type === "AUDIT_RESULTS") {
      const tabId = sender.tab?.id;
      const auditId = message.auditId;

      console.log(
        `[Background] Received AUDIT_RESULTS for audit: ${auditId || "unknown"}`
      );
      console.log(`[Background] Message keys:`, Object.keys(message));
      console.log(
        `[Background] Has requirements: ${!!message.requirements}, Has data: ${!!message.data}`
      );
      console.log(
        `[Background] Requirements length: ${message.requirements?.length}, Data length: ${message.data?.length}`
      );

      // Save the scraped data to storage
      if (auditId && message.requirements && message.data) {
        console.log(`[Background] Saving audit data for: ${auditId}`);
        saveAuditData(auditId, {
          requirements: message.requirements,
          courses: message.data,
        })
          .then(() => {
            console.log(
              `[Background] Successfully saved audit data for: ${auditId}`
            );
          })
          .catch((err) => {
            console.error(
              `[Background] Failed to save audit data for ${auditId}:`,
              err
            );
          });
      } else {
        console.error(
          `[Background] CANNOT SAVE - missing data! auditId: ${auditId}, requirements: ${!!message.requirements}, data: ${!!message.data}`
        );
      }

      if (tabId) {
        console.log(`[Background] Closing scraper tab: ${tabId}`);

        // Clear safety timeout
        const timeout = scraperTabs.get(tabId);
        if (timeout) clearTimeout(timeout);
        scraperTabs.delete(tabId);

        // Close the scraper tab
        browser.tabs.remove(tabId).catch((err) => {
          console.error("[Background] Failed to close scraper tab:", err);
        });
      }

      // Resolve pending batch scrape promise if exists
      if (auditId && pendingScrapes.has(auditId)) {
        console.log(
          `[Background] Resolving pending scrape for audit: ${auditId}`
        );
        pendingScrapes.get(auditId)!.resolve();
      }

      // Don't send response
      return false;
    }

    // Handle scrape errors from content script
    if (message.type === "AUDIT_SCRAPE_ERROR") {
      const tabId = sender.tab?.id;
      const auditId = message.auditId;
      const error = message.error;

      console.error(`[Background] Scrape error for audit ${auditId}: ${error}`);

      if (tabId) {
        console.log(`[Background] Closing failed scraper tab: ${tabId}`);

        // Clear safety timeout
        const timeout = scraperTabs.get(tabId);
        if (timeout) clearTimeout(timeout);
        scraperTabs.delete(tabId);

        // Close the scraper tab
        browser.tabs.remove(tabId).catch(() => {});
      }

      // Reject pending batch scrape promise if exists
      if (auditId && pendingScrapes.has(auditId)) {
        console.log(
          `[Background] Rejecting pending scrape for audit: ${auditId}`
        );
        pendingScrapes.get(auditId)!.reject(new Error(error));
      }

      return false;
    }
  });
});
