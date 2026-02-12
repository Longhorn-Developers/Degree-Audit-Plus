import { saveAuditData } from "@/lib/storage";
import {
  closeScraperWindow,
  createScraperTab,
  closeScraperTab,
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

  // Open degree audit page.
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openDegreeAudit") {
      const url = browser.runtime.getURL(
        `/degree-audit.html?auditId=${message.auditId}`,
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

    // Handle "Run New Audit" from popup
    if (message.type === "RUN_NEW_AUDIT") {
      const UT_AUDIT_URL =
        "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

      (async () => {
        try {
          // Check if there's already a tab open to the audit page
          const tabs = await browser.tabs.query({
            url: "*://utdirect.utexas.edu/*",
          });
          const exactAuditTab = tabs.find((t) =>
            t.url?.startsWith(UT_AUDIT_URL),
          );

          if (exactAuditTab?.id) {
            // Tab already exists, inject clicker
            await browser.scripting.executeScript({
              target: { tabId: exactAuditTab.id },
              func: () => {
                const btn =
                  document.querySelector<HTMLButtonElement>(".run_button");
                if (btn) btn.click();
              },
            });
            sendResponse({ success: true, existing: true });
          } else {
            // Create new tab
            const newTab = await browser.tabs.create({
              url: UT_AUDIT_URL,
              active: false,
            });

            // Wait for tab to load, then inject clicker
            const listener = async (tabId: number, info: any) => {
              if (tabId === newTab.id && info.status === "complete") {
                browser.tabs.onUpdated.removeListener(listener);

                await browser.scripting.executeScript({
                  target: { tabId },
                  func: () => {
                    const clickWhenReady = () => {
                      const btn =
                        document.querySelector<HTMLButtonElement>(
                          ".run_button",
                        );
                      if (btn) {
                        btn.click();
                        return;
                      }

                      // If button not found, wait for it
                      let tries = 0;
                      const iv = setInterval(() => {
                        const btn =
                          document.querySelector<HTMLButtonElement>(
                            ".run_button",
                          );
                        if (btn) {
                          btn.click();
                          clearInterval(iv);
                        } else if (++tries >= 120) {
                          clearInterval(iv);
                        }
                      }, 500);
                    };

                    if (document.readyState === "complete") {
                      clickWhenReady();
                    } else {
                      window.addEventListener("load", clickWhenReady, {
                        once: true,
                      });
                    }
                  },
                });

                // Close tab after 30 seconds
                setTimeout(() => {
                  if (newTab.id) browser.tabs.remove(newTab.id).catch(() => {});
                }, 30000);
              }
            };

            browser.tabs.onUpdated.addListener(listener);
            sendResponse({ success: true, existing: false });
          }
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();

      return true; // Keep message channel open
    }
  });

  // scrape audit data

  // Scrape a single audit by ID
  // Creates a tab in the minimized scraper window, waits for load, sends RUN_SCRAPER message
  // Resolution happens via pendingScrapes map when AUDIT_RESULTS is received
  async function scrapeAuditById(auditId: string): Promise<void> {
    const url = `https://utdirect.utexas.edu/apps/degree/audits/results/${auditId}/`;
    console.log(`[Batch Scraper] Starting scrape for audit: ${auditId}`);

    try {
      const { tabId } = await createScraperTab({
        url,
        mode: "background",
        timeout: 30000,
        messageOnLoad: { type: "RUN_SCRAPER", auditId },
      });
      console.log(
        `[Batch Scraper] Tab ${tabId} loaded, message sent for audit: ${auditId}`,
      );
    } catch (err) {
      console.error(`[Batch Scraper] Failed for ${auditId}:`, err);
      throw err;
    }
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
        auditIds,
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
      browser.runtime
        .sendMessage({ type: "SCRAPE_ALL_STARTED" })
        .catch(() => {});

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
                setTimeout(() => reject(new Error("Scrape timeout")), 35000),
              ),
            ]);

            console.log(
              `[Batch Scraper] Successfully scraped audit: ${auditId}`,
            );
            succeeded.push(auditId);
          } catch (e) {
            console.error(
              `[Batch Scraper] Failed to scrape audit ${auditId}:`,
              e,
            );
            failed.push(auditId);
          } finally {
            pendingScrapes.delete(auditId);
          }
          // delay to nto overhwelm serv
          await new Promise((r) => setTimeout(r, 150));
        }

        console.log(
          `[Batch Scraper] Complete. Succeeded: ${succeeded.length}, Failed: ${failed.length}`,
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
      (async () => {
        try {
          const { tabId } = await createScraperTab({
            url: message.url,
            mode: "background",
            timeout: 30000,
            messageOnLoad: { type: "RUN_SCRAPER" },
          });
          sendResponse({ status: "started", tabId });
        } catch (err) {
          sendResponse({
            status: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      })();
      return true;
    }

    // Listen for audit results from scraper tab and close it
    if (message.type === "AUDIT_RESULTS") {
      const tabId = sender.tab?.id;
      const auditId = message.auditId;

      console.log(
        `[Background] Received AUDIT_RESULTS for audit: ${auditId || "unknown"}`,
      );
      console.log(`[Background] Message keys:`, Object.keys(message));
      console.log(
        `[Background] Has requirements: ${!!message.requirements}, Has data: ${!!message.data}`,
      );
      console.log(
        `[Background] Requirements length: ${message.requirements?.length}, Data length: ${message.data?.length}`,
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
              `[Background] Successfully saved audit data for: ${auditId}`,
            );
          })
          .catch((err) => {
            console.error(
              `[Background] Failed to save audit data for ${auditId}:`,
              err,
            );
          });
      } else {
        console.error(
          `[Background] CANNOT SAVE - missing data! auditId: ${auditId}, requirements: ${!!message.requirements}, data: ${!!message.data}`,
        );
      }

      if (tabId) {
        console.log(`[Background] Closing scraper tab: ${tabId}`);
        closeScraperTab(tabId).catch((err) => {
          console.error("[Background] Failed to close scraper tab:", err);
        });
      }

      // Resolve pending batch scrape promise if exists
      if (auditId && pendingScrapes.has(auditId)) {
        console.log(
          `[Background] Resolving pending scrape for audit: ${auditId}`,
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
        closeScraperTab(tabId).catch(() => {});
      }

      // Reject pending batch scrape promise if exists
      if (auditId && pendingScrapes.has(auditId)) {
        console.log(
          `[Background] Rejecting pending scrape for audit: ${auditId}`,
        );
        pendingScrapes.get(auditId)!.reject(new Error(error));
      }

      return false;
    }
  });
});
