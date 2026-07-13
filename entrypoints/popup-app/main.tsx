import App from "@/features/popup/popup-app";
import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const root = document.getElementById("degree-audit-plus-popup-root-container");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
