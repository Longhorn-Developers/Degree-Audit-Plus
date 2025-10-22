import { createRoot } from "react-dom/client";
import TryDAPBanner from "./components/banner";

export default defineContentScript({
  matches: ["https://utdirect.utexas.edu/apps/degree/audits/"],
  cssInjectionMode: "ui",
  async main(ctx) {
    console.log("Content script loaded.");

    // Load fonts dynamically
    loadFonts();

    defineUTDToppageHeight();

    const tryDapBanner = await createShadowRootUi(ctx, {
      name: "dap-banner-ui",
      position: "inline",
      append: "before",
      anchor: "#service_content",
      onMount(container) {
        createRoot(container).render(<TryDAPBanner />);
      },
    });

    tryDapBanner.mount();
  },
});

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

function defineUTDToppageHeight() {
  const utdToppage = document.querySelector("#utd_toppage");
  if (utdToppage) {
    (utdToppage as HTMLElement).style.height = "96px";
  }
}
