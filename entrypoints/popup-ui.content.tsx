import React from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./popup-app/main";
// Import Tailwind styles - WXT will inject these into the shadow DOM with cssInjectionMode: "ui"
import "./styles/content.css";

// Wrapper component that adds positioning, click-outside handling, and animations
function PopupWrapper({ onClose }: { onClose: () => void }) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the popup content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: "16px",
        backgroundColor: "transparent",
        fontFamily: "'Roboto Flex', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          borderRadius: "4px",
          borderColor: "#EAE8E1",
          borderWidth: "1px",
          backgroundColor: "#fff",
          boxShadow: " 5px ",
          overflow: "hidden",
          animation: "popupSlideIn 0.2s ease-out",
        }}
      >
        <App />
      </div>
      <style>{`
        @keyframes popupSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    console.log("[DAP Popup] Content script loaded");

    let isVisible = false;
    let ui: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let root: Root | null = null;

    // Listen for toggle message from background script
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "TOGGLE_POPUP") {
        console.log(
          "[DAP Popup] Toggle message received, isVisible:",
          isVisible
        );
        if (isVisible) {
          hidePopup();
        } else {
          showPopup();
        }
        return true;
      }
    });

    async function showPopup() {
      if (isVisible || ui) return;

      console.log("[DAP Popup] Showing popup");

      ui = await createShadowRootUi(ctx, {
        name: "dap-popup-ui",
        position: "overlay",
        zIndex: 2147483647,
        onMount(container) {
          // Add Google Fonts
          const fontLink = document.createElement("link");
          fontLink.rel = "stylesheet";
          fontLink.href =
            "https://fonts.googleapis.com/css2?family=Staatliches&family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap";

          // Get the shadow root and append font link there
          const shadowRoot = container.getRootNode() as ShadowRoot;
          shadowRoot.appendChild(fontLink);

          // Create a wrapper div for React
          const appContainer = document.createElement("div");
          appContainer.id = "dap-popup-root";
          container.appendChild(appContainer);

          root = createRoot(appContainer);
          root.render(<PopupWrapper onClose={hidePopup} />);
        },
        onRemove() {
          root?.unmount();
          root = null;
        },
      });

      ui.mount();
      isVisible = true;
    }

    function hidePopup() {
      if (!isVisible || !ui) return;

      console.log("[DAP Popup] Hiding popup");
      ui.remove();
      ui = null;
      isVisible = false;
    }
  },
});
