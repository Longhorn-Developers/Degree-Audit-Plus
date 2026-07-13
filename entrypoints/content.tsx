import { startAuditContentController } from "@/features/audit-scraping/content-controller";
import { createRoot } from "react-dom/client";
import TryDAPBanner from "@/features/banner/try-dap-banner";
import "./styles/content.css";

function loadFonts(): void {
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnect);

  const fontHost = document.createElement("link");
  fontHost.rel = "preconnect";
  fontHost.href = "https://fonts.gstatic.com";
  fontHost.crossOrigin = "anonymous";
  document.head.appendChild(fontHost);

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href =
    "https://fonts.googleapis.com/css2?family=Staatliches:wght@400&family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap";
  document.head.appendChild(stylesheet);
}

function setHeaderHeight(): void {
  const header = document.querySelector<HTMLElement>("#utd_toppage");
  if (header) header.style.height = "96px";
}

export default defineContentScript({
  matches: ["https://utdirect.utexas.edu/apps/degree/audits/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    // Register message handlers before asynchronous setup so background
    // scraper tabs always have a receiver when loading completes.
    startAuditContentController(document);
    loadFonts();
    setHeaderHeight();

    if (/^\/apps\/degree\/audits\/?$/.test(window.location.pathname)) {
      const banner = await createShadowRootUi(ctx, {
        name: "dap-banner-ui",
        position: "inline",
        append: "before",
        anchor: "#service_content",
        onMount(container, _shadow, shadowHost) {
          shadowHost.classList.toggle(
            "dark",
            document.documentElement.classList.contains("dark"),
          );
          createRoot(container).render(<TryDAPBanner />);
        },
      });
      banner.mount();
    }
  },
});
