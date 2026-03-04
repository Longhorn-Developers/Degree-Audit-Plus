/**
 * Scraper Window Management
 * Handles background tab stuf for scraping (we are opening a new window in backg)
 */

// for creating background scraper.
export interface CreateScraperTabOptions {
  url: string;
  mode?: "background" | "foreground"; // background = minimized window, foreground = current window
  timeout?: number; // default 30000ms
  messageOnLoad?: { type: string; [key: string]: any }; // optional message to send when page loads
}

export interface ScraperTabResult {
  tabId: number;
  close: () => Promise<void>; // cleanup and remove tab
}

export class ScraperTabError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TAB_CREATE_FAILED"
      | "TIMEOUT"
      | "TAB_CLOSED"
      | "MESSAGE_FAILED",
    public readonly tabId?: number,
  ) {
    super(message);
    this.name = "ScraperTabError";
  }
}

// ============ Module State ============

let scraperWindowId: number | null = null;

// Track active scraper tabs for cleanup
const activeScraperTabs = new Map<
  number,
  {
    cleanup: () => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }
>();

export async function getOrCreateScraperWindow(): Promise<number> {
  // Check if existing window is still valid
  if (scraperWindowId !== null) {
    try {
      await browser.windows.get(scraperWindowId);
      return scraperWindowId;
    } catch {
      scraperWindowId = null;
    }
  }

  // Remember current focused window to refocus later (may not exist in service worker)
  let currentWindowId: number | undefined;
  try {
    const windows = await browser.windows.getAll({ windowTypes: ["normal"] });
    const focusedWindow = windows.find((w) => w.focused);
    currentWindowId = focusedWindow?.id;
  } catch (err) {
    console.warn("[Scraper] Could not get current window:", err);
  }

  // Create a minimized scraper window
  // Note: When using state: "minimized", cannot specify width/height/left/top
  const scraperWindow = await browser.windows.create({
    state: "minimized",
    focused: false,
    type: "normal",
  });

  if (!scraperWindow?.id) {
    throw new Error("Failed to create scraper window");
  }
  scraperWindowId = scraperWindow.id;

  // Re-focus user's original window
  if (currentWindowId) {
    try {
      await browser.windows.update(currentWindowId, { focused: true });
    } catch (err) {
      console.warn("[Scraper] Could not refocus original window:", err);
    }
  }

  console.log(`[Scraper] Created minimized window: ${scraperWindowId}`);
  return scraperWindowId;
}

export async function closeScraperWindow(): Promise<void> {
  if (scraperWindowId !== null) {
    console.log(`[Scraper] Closing window: ${scraperWindowId}`);
    await browser.windows.remove(scraperWindowId).catch(() => {});
    scraperWindowId = null;
  }
}

// ============ Tab Management  ++++

/**
 * Creates a tab for scraping with automatic cleanup and timeout handling.
 *
 * @param options - Configuration for the scraper tab
 * @returns Promise that resolves when the tab is loaded and ready
 */
export async function createScraperTab(
  options: CreateScraperTabOptions,
): Promise<ScraperTabResult> {
  const { url, mode = "background", timeout = 30000, messageOnLoad } = options;

  // Get window ID based on mode
  const windowId =
    mode === "background" ? await getOrCreateScraperWindow() : undefined;

  return new Promise((resolve, reject) => {
    let tabId: number | null = null;
    let isResolved = false;

    // Cleanup function to remove listeners and clear timeout
    const cleanup = () => {
      browser.tabs.onUpdated.removeListener(updateListener);
      browser.tabs.onRemoved.removeListener(removeListener);
      if (tabId) {
        const entry = activeScraperTabs.get(tabId);
        if (entry) {
          clearTimeout(entry.timeoutId);
          activeScraperTabs.delete(tabId);
        }
      }
    };

    // Close function for external use
    const close = async () => {
      cleanup();
      if (tabId) {
        await browser.tabs.remove(tabId).catch(() => {});
      }
    };

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        console.log(`[Scraper] Timeout for tab ${tabId}, closing`);
        cleanup();
        if (tabId) {
          browser.tabs.remove(tabId).catch(() => {});
        }
        reject(
          new ScraperTabError(
            `Timeout: Page did not load within ${timeout}ms`,
            "TIMEOUT",
            tabId ?? undefined,
          ),
        );
      }
    }, timeout);

    // Helper to handle successful load
    const handleTabComplete = () => {
      if (isResolved || !tabId) return;
      isResolved = true;
      cleanup();

      if (messageOnLoad) {
        browser.tabs
          .sendMessage(tabId, messageOnLoad)
          .then(() => {
            resolve({ tabId: tabId!, close });
          })
          .catch((err) => {
            console.error(
              `[Scraper] Failed to send message to tab ${tabId}:`,
              err,
            );
            browser.tabs.remove(tabId!).catch(() => {});
            reject(
              new ScraperTabError(
                `Failed to send message: ${err.message}`,
                "MESSAGE_FAILED",
                tabId!,
              ),
            );
          });
      } else {
        resolve({ tabId: tabId!, close });
      }
    };

    // Listen for tab load completion
    const updateListener = (id: number, changeInfo: { status?: string }) => {
      if (tabId && id === tabId && changeInfo.status === "complete") {
        handleTabComplete();
      }
    };

    // Listen for premature tab closure
    const removeListener = (closedTabId: number) => {
      if (tabId && closedTabId === tabId && !isResolved) {
        cleanup();
        reject(
          new ScraperTabError(
            "Tab closed before loading completed",
            "TAB_CLOSED",
            tabId,
          ),
        );
      }
    };

    // Add listeners BEFORE creating tab to avoid race conditions
    browser.tabs.onUpdated.addListener(updateListener);
    browser.tabs.onRemoved.addListener(removeListener);

    // Now create the tab
    browser.tabs
      .create({
        url,
        active: mode === "foreground",
        windowId,
      })
      .then((tab) => {
        if (!tab?.id) {
          cleanup();
          reject(
            new ScraperTabError("Failed to create tab", "TAB_CREATE_FAILED"),
          );
          return;
        }

        tabId = tab.id;

        // Track the tab for cleanup
        activeScraperTabs.set(tabId, { cleanup, timeoutId });

        // Check if already complete (cached page)
        if (tab.status === "complete") {
          handleTabComplete();
        }
      })
      .catch((err) => {
        console.error(`[Scraper] Failed to create tab:`, err);
        cleanup();
        reject(
          new ScraperTabError(
            `Failed to create tab: ${err.message}`,
            "TAB_CREATE_FAILED",
          ),
        );
      });
  });
}

/**
 * Closes a scraper tab by ID, cleaning up any associated resources.
 * Safe to call even if tab is already closed.
 *
 * @param tabId - The ID of the tab to close
 */
export async function closeScraperTab(tabId: number): Promise<void> {
  const entry = activeScraperTabs.get(tabId);
  if (entry) {
    clearTimeout(entry.timeoutId);
    entry.cleanup();
    activeScraperTabs.delete(tabId);
  }
  await browser.tabs.remove(tabId).catch(() => {});
}
