import ReactDOM from "react-dom/client";
import "./style.css";
import React from "react";
import { CalendarDotsIcon, GearSixIcon, CubeIcon } from "@phosphor-icons/react";
import { browser } from "wxt/browser";

export default function App() {
  const handleOpenDegreeAuditPage = () => {
    const url = browser.runtime.getURL("degree-audit.html" as any);
    browser.tabs.create({ url });
  };

  return (
    <div className="w-[438px] bg-white rounded-mdfont-sans overflow-hidden">
      <header className="flex justify-between items-center p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <img
            className="rounded-full"
            src="/icon/LHD Logo.png"
            height={48}
            width={48}
          />
          <span className="font-bold text-lg text-dap-primary">
            Degree Audit
            <br /> Plus
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            className="
            flex items-center space-x-2 bg-[#bf5700] text-white 
            px-4 py-2 rounded-sm font-medium 
            hover:bg-opacity-90 transition-opacity cursor-pointer
          "
          >
            <CalendarDotsIcon weight="fill" color="white" size={24} />
            <p className="text-lg">Past Audits</p>
          </button>
          <button className="text-gray-900 hover:text-gray-800 transition-colors cursor-pointer">
            <GearSixIcon size={25} />
          </button>
        </div>
      </header>

      <main className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to Degree Audit Plus
        </h1>
        <button
          onClick={handleOpenDegreeAuditPage}
          className="
          mt-6 w-full flex items-center justify-center space-x-2
          bg-[#bf5700] text-white px-4 py-3 rounded-md
          text-lg font-medium hover:bg-opacity-90 transition-opacity cursor-pointer
        "
        >
          <span>Take me to Degree Audit Plus</span>
        </button>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
