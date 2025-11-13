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
  // ONLY runs on UT Direct audits home page - this is where we fetch fresh data
  matches: ["https://utdirect.utexas.edu/apps/degree/audits/"],
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
 * This function only runs when the user is on the UT Direct audits home page
 * The popup will read from this cached storage data when opened from any page
 */
async function fetchAndStoreAuditHistory() {
  try {
    console.log("Fetching audit history...");
    const audits = await fetchAuditHistory();
    console.log(`Successfully fetched ${audits.length} audits`);
    await saveAuditHistory(audits);
    console.log("Audit history saved to storage");
  } catch (error) {
    console.error("Error fetching audit history:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    await saveAuditHistory([], errorMessage);
  }
}

function defineUTDToppageHeight() {
  const utdToppage = document.querySelector("#utd_toppage");
  if (utdToppage) {
    (utdToppage as HTMLElement).style.height = "96px";
  }
}
