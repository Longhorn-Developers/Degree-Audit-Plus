import ReactDOM from "react-dom/client";
import "./style.css";
import React from "react";
import { CalendarDotsIcon, GearSixIcon, PlayIcon } from "@phosphor-icons/react";
import { browser } from "wxt/browser";

const UT_AUDIT_URL = "https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";

export default function App() {
  const handleOpenDegreeAuditPage = () => {
    const url = browser.runtime.getURL("degree-audit.html" as any);
    browser.tabs.create({ url });
  };

  const injectClicker = async (tabId: number) => {
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const clickWhenReady = () => {
          const click = () => {
            const btn = document.querySelector<HTMLButtonElement>(".run_button");
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          };

          if (click()) return;

          let tries = 0;
          const maxTries = 120;
          const iv = setInterval(() => {
            if (click() || ++tries >= maxTries) clearInterval(iv);
          }, 500);

          const mo = new MutationObserver(() => {
            if (click()) mo.disconnect();
          });
          mo.observe(document.documentElement, { childList: true, subtree: true });

          setTimeout(() => {
            const isLogin =
              document.querySelector('input[type="password"]') ||
              document.querySelector('form[action*="logon"], form[action*="login"]');
            if (isLogin) {
              console.warn("UTDirect login detected. Please sign in; the audit will run afterward.");
            }
          }, 1500);
        };

        if (document.readyState === "complete") clickWhenReady();
        else window.addEventListener("load", clickWhenReady, { once: true });
      },
    });
  };

  const handleRerunAudit = async () => {
    const tabs = await browser.tabs.query({ url: "*://utdirect.utexas.edu/*" });
    const idaTab =
      tabs.find((t) => t.url?.startsWith(UT_AUDIT_URL)) ??
      tabs.find((t) => t.url?.includes("/apps/degree/audits/"));

    if (idaTab?.id) {
      // Ensure we’re on the exact page; if not, navigate then inject.
      if (!idaTab.url?.startsWith(UT_AUDIT_URL)) {
        await browser.tabs.update(idaTab.id, { url: UT_AUDIT_URL, active: true });
        const listener = async (tabId: number, info: any) => {
          if (tabId === idaTab.id && info.status === "complete") {
            browser.tabs.onUpdated.removeListener(listener);
            await injectClicker(tabId);
          }
        };
        browser.tabs.onUpdated.addListener(listener);
      } else {
        await browser.tabs.update(idaTab.id, { active: true });
        await injectClicker(idaTab.id);
      }
    } else {
      const newTab = await browser.tabs.create({ url: UT_AUDIT_URL, active: true });
      const listener = async (tabId: number, info: any) => {
        if (tabId === newTab.id && info.status === "complete") {
          browser.tabs.onUpdated.removeListener(listener);
          await injectClicker(tabId);
        }
      };
      browser.tabs.onUpdated.addListener(listener);
    }
  };

  return (
    <div className="w-[438px] bg-white rounded-md font-sans overflow-hidden">
      <header className="flex justify-between items-center p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <img className="rounded-full" src="/icon/LHD Logo.png" height={48} width={48} />
          <span className="font-bold text-lg text-dap-primary">
            Degree Audit
            <br /> Plus
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 bg-[#bf5700] text-white px-4 py-2 rounded-sm font-medium hover:bg-opacity-90 transition-opacity cursor-pointer">
            <CalendarDotsIcon weight="fill" color="white" size={24} />
            <p className="text-lg">Past Audits</p>
          </button>
          <button className="text-gray-900 hover:text-gray-800 transition-colors cursor-pointer">
            <GearSixIcon size={25} />
          </button>
        </div>
      </header>

      <main className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Degree Audit Plus</h1>

        <button
          onClick={handleOpenDegreeAuditPage}
          className="mt-6 w-full flex items-center justify-center space-x-2 bg-[#bf5700] text-white px-4 py-3 rounded-md text-lg font-medium hover:bg-opacity-90 transition-opacity cursor-pointer"
        >
          <span>Take me to Degree Audit Plus</span>
        </button>

        <button
          onClick={handleRerunAudit}
          className="mt-4 w-full flex items-center justify-center space-x-2 bg-[#444] text-white px-4 py-3 rounded-md text-lg font-medium hover:bg-opacity-90 transition-opacity cursor-pointer"
        >
          <PlayIcon size={22} color="white" weight="fill" />
          <span>Rerun Audit</span>
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
