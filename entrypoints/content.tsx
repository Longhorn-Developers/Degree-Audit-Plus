import { createRoot } from "react-dom/client";
import TryDAPBanner from "./components/banner";
// Import your Tailwind CSS - THIS IS CRITICAL for shadow DOM
import "./styles/content.css"; // Make sure this path is correct
import { fetchAuditHistory } from "@/lib/audit-history-scraper";
import { saveAuditHistory } from "@/lib/storage";

function loadFonts() {
  const preconnect1 = document.createElement("link");
  preconnect1.rel = "preconnect";
  preconnect1.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement("link");
  preconnect2.rel = "preconnect";
  preconnect2.href = "https://fonts.gstatic.com";
  preconnect2.crossOrigin = "anonymous";
  document.head.appendChild(preconnect2);

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Staatliches:wght@400&family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap";
  document.head.appendChild(fontLink);

  console.log("Staatliches and Roboto Flex fonts loaded dynamically");
}

export default defineContentScript({
  // Runs on ALL UT Direct audit pages - fetches fresh data and watches for updates
  // Includes: /audits/, /audits/submissions/history/, /audits/requests/history/, etc.
  matches: ["https://utdirect.utexas.edu/apps/degree/audits/*"],
  cssInjectionMode: "ui", // This should inject CSS into shadow DOM
  async main(ctx) {
    console.log("Content script loaded on UT Direct audits page.");
    // Load fonts dynamically
    loadFonts();
    defineUTDToppageHeight();

    const tryDapBanner = await createShadowRootUi(ctx, {
      name: "dap-banner-ui",
      position: "inline",
      append: "before",
      anchor: "#service_content",
      onMount(container) {
        // The container here is inside the shadow DOM
        // WXT should automatically inject your CSS here with cssInjectionMode: "ui"
        createRoot(container).render(<TryDAPBanner />);
      },
    });

    tryDapBanner.mount();

    // Fetch fresh audit history and update storage
    // This ONLY runs when user visits the UT Direct audits home page
    fetchAndStoreAuditHistory();
  },
});

/**
 * Fetch audit history from UT Direct and store in browser storage
 * Runs on any UT Direct audit page and sets up observer for auto-refresh
 * The popup will read from this cached storage data when opened from any page
 */
async function fetchAndStoreAuditHistory() {
  try {
    console.log("Fetching audit history...");
    const audits = await fetchAuditHistory();
    console.log(`Successfully fetched ${audits.length} audits`);
    await saveAuditHistory(audits);
    console.log("Audit history saved to storage");

    // Setup observer to watch for table changes (new audits completed)
    setupHistoryTableObserver();
  } catch (error) {
    console.error("Error fetching audit history:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    await saveAuditHistory([], errorMessage);
  }
}

// Watch for changes to the audit history table
function setupHistoryTableObserver() {
  let observerActive = false;
  let lastRowCount = 0;

  const checkForTable = () => {
    if (observerActive) return;

    // Find audit history table specifically (not just any table)
    // Check for multiple possible table headers
    const tables = document.querySelectorAll("table");
    const historyTable = Array.from(tables).find((table) => {
      const text = table.textContent || "";
      return (
        text.includes("Degree Audits Requested") ||
        text.includes("Request Created") ||
        text.includes("Audit Type")
      );
    });

    if (historyTable) {
      const tbody = historyTable.querySelector("tbody");
      if (!tbody) return;
      console.log("Setting up audit history observer...");
      observerActive = true;
      lastRowCount = tbody.querySelectorAll("tr").length;
      let debounceTimer: NodeJS.Timeout | null = null;
      const observer = new MutationObserver(() => {
        const currentRowCount = tbody.querySelectorAll("tr").length;
        if (currentRowCount > lastRowCount) {
          console.log(
            `New audit detected! Rows: ${lastRowCount} → ${currentRowCount}`
          );
          if (debounceTimer) clearTimeout(debounceTimer);

          debounceTimer = setTimeout(async () => {
            console.log("Re-fetching audit history...");
            try {
              const audits = await fetchAuditHistory();
              await saveAuditHistory(audits);
              console.log(`Updated storage with ${audits.length} audits`);
              lastRowCount = currentRowCount;
            } catch (error) {
              console.error("Error re-fetching after table update:", error);
            }
          }, 2000); // 2 seconds (sufficient for audit processing)
        }
      });

      observer.observe(tbody, {
        childList: true,
        subtree: false,
      });

      console.log(`Observer active ✓ (tracking ${lastRowCount} rows)`);
    }
  };

  // Check immediately
  checkForTable();
  // incase load is ltr
  setTimeout(checkForTable, 3000);
}

function defineUTDToppageHeight() {
  const utdToppage = document.querySelector("#utd_toppage");
  if (utdToppage) {
    (utdToppage as HTMLElement).style.height = "96px";
  }
}
