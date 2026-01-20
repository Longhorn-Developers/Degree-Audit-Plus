/**
 * Scraper Window Management
 * Handles background tab stuf for scraping (we are opening a new window in backg)
 */

let scraperWindowId: number | null = null;

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

  // Remember current window to refocus later
  const currentWindow = await browser.windows.getCurrent();

  // Create minimized scraper window
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
  if (currentWindow.id) {
    await browser.windows.update(currentWindow.id, { focused: true });
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
