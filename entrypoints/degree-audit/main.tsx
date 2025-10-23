import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/content.css";

function DegreeAuditPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center space-x-4">
            <img
              className="rounded-full"
              src="/icon/LHD Logo.png"
              height={64}
              width={64}
              alt="Degree Audit Plus Logo"
            />
            <h1 className="text-4xl font-bold text-dap-primary">
              Degree Audit Plus
            </h1>
          </div>
        </header>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <DegreeAuditPage />
  </React.StrictMode>
);
