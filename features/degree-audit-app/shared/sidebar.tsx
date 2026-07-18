import DegreeAuditCard from "./audit-card";
import { usePreferences } from "@/features/preferences/preferences-provider";
import logo from "@/public/logo.png";
import {
  ArrowUpRight,
  DiscordLogo,
  Gear,
  GithubLogo,
  InstagramLogo,
  LinkedinLogo,
  Moon,
  Plus,
  Sidebar as SidebarIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useAuditContext } from "@/features/audit/audit-provider";

const Sidebar = () => {
  const { sidebarIsOpen, toggleSidebar } = usePreferences();
  const { currentAuditId, setCurrentAuditId, history, renameAuditTitle } =
    useAuditContext();
  return (
    <div
      className={cn(
        "py-5 h-full min-h-screen flex flex-col fixed left-0 top-0 z-20 bg-background border-r border-dap-border whitespace-nowrap overflow-hidden transition-[width] duration-300 ease-out",
        {
          "w-[365px]": sidebarIsOpen,
          "w-0 pointer-events-none": !sidebarIsOpen,
        },
      )}
      aria-hidden={!sidebarIsOpen}
      {...(!sidebarIsOpen ? { inert: true } : {})}
    >
      {/* Header */}
      <div className="px-8 pb-4 flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-2">
          <img src={logo} alt="DAP Logo" className="w-12 h-12" />
          <span className="text-dap-orange font-semibold text-xl">
            Degree Audit Plus
          </span>
        </div>
        <button
          className="p-1 hover:bg-black/5 rounded"
          onClick={toggleSidebar}
        >
          <SidebarIcon size={24} className="text-text" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8">
        {/* MY AUDITS Section */}
        <div className="flex items-center justify-between">
          <span className="text-[19px] font-bold tracking-[-0.19px]">
            MY AUDITS
          </span>
          <button className="p-1 hover:bg-black/5 rounded">
            <Plus size={24} className="text-text" />
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {history.audits.length === 0 ? (
            <p className="text-sm text-muted">No audits found</p>
          ) : (
            history.audits.map((audit, index) => {
              const id = audit.auditId || String(index);
              return (
                <DegreeAuditCard
                  key={id}
                  title={audit.title}
                  percentage={audit.percentage}
                  isSelected={currentAuditId === id}
                  onToggle={() => {
                    if (audit.auditId) {
                      setCurrentAuditId(audit.auditId); // No page refresh, just update state
                    }
                  }}
                  onRename={(title) => {
                    if (audit.auditId) {
                      renameAuditTitle(audit.auditId, title);
                    }
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Pinned Resources + Feedback (stick to bottom, above footer) */}
      <div className="px-8">
        {/* Divider */}
        <hr className="my-5 border-dap-border" />

        {/* RESOURCES Section */}
        <div className="text-[25px] font-bold tracking-[-0.19px]">
          RESOURCES
        </div>
        <div className="mt-3 flex flex-col gap-2 ">
          <a
            href="#"
            className="text-dap-orange text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            UT Core Requirements <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="text-dap-orange text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            UT Degree Plans <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="text-dap-orange text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            Registration Info Sheet (RIS) <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="text-dap-orange text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            Register for Courses <ArrowUpRight size={14} />
          </a>
        </div>

        {/* Divider */}
        <hr className="my-5 border-dap-border" />

        {/* Feedback Link */}
        <a
          href="#"
          className="text-dap-orange font-semibold hover:underline flex items-center gap-1"
        >
          Send us Feedback! <ArrowUpRight size={14} />
        </a>
      </div>

      {/* Footer */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <img src={logo} alt="Longhorn Developers" className="w-12 h-12" />
          <div className="text-sm">
            <span className="text-dap-orange font-semibold">
              MADE WITH LOVE, BY
            </span>
            <br />
            <span className="text-dap-orange font-semibold">
              LONGHORN DEVELOPERS
            </span>
          </div>
        </div>
        <div className="flex items-center w-full gap-4 text-text">
          <a href="#" aria-label="Discord">
            <DiscordLogo size={24} />
          </a>
          <a href="#" aria-label="Instagram">
            <InstagramLogo size={24} />
          </a>
          <a href="#" aria-label="LinkedIn">
            <LinkedinLogo size={24} />
          </a>
          <a href="#" aria-label="GitHub">
            <GithubLogo size={24} />
          </a>
          <a href="#" aria-label="Dark Mode" className="ml-auto">
            <Moon size={24} />
          </a>
          <a href="#" aria-label="Settings">
            <Gear size={24} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
