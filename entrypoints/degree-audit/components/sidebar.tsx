import DegreeAuditCard from "@/entrypoints/components/audit-card";
import { usePreferences } from "@/entrypoints/degree-audit/providers/preferences-provider";
import lhdLogo from "@/public/icon/LHD Logo.png";
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
import clsx from "clsx";
import { useAuditContext } from "../providers/audit-provider";

const Sidebar = () => {
  const { sidebarIsOpen, toggleSidebar } = usePreferences();
  const { currentAuditId, setCurrentAuditId, history } = useAuditContext();
  // const [audits, setAudits] = useState<DegreeAuditCardProps[]>([]); //history
  // const [loading, setLoading] = useState(true);

  // React.useEffect(() => {
  //   async function loadAudits() {
  //     try {
  //       const data = await getAuditHistory();
  //       if (data && !data.error) {
  //         setAudits(data.audits);
  //       }
  //     } catch (e) {
  //       console.error("Error loading audit history:", e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadAudits();
  // }, []);

  return (
    <div
      className={clsx(
        "py-5 h-full min-h-screen flex flex-col fixed left-0 top-0 bg-white border-r border-[var(--color-dap-border)] whitespace-nowrap transition-[width] duration-300 ease-out",
        {
          "w-[365px] overflow-visible": sidebarIsOpen,
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
          <SidebarIcon size={24} className="text-[var(--color-dap-dark-alt)]" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8">
        {/* MY AUDITS Section */}
        <div className="flex items-center justify-between">
          <span className="text-[19px] font-bold text-[var(--color-dap-dark-heading)] tracking-[-0.19px]">
            MY AUDITS
          </span>
          <button className="p-1 hover:bg-black/5 rounded">
            <Plus size={24} className="text-[var(--color-dap-dark-alt)]" />
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {history.audits.length === 0 ? (
            <p className="text-sm text-gray-500">No audits found</p>
          ) : (
            history.audits.map((audit, index) => {
              const id = audit.auditId || String(index);
              return (
                <DegreeAuditCard
                  key={id}
                  title={audit.title}
                  majors={audit.majors}
                  minors={audit.minors}
                  percentage={audit.percentage}
                  isSelected={currentAuditId === id}
                  isExpanded={currentAuditId === id}
                  onToggle={() => {
                    if (audit.auditId) {
                      setCurrentAuditId(audit.auditId); // No page refresh, just update state
                    }
                  }}
                  onMenuClick={() => {
                    console.log("Menu clicked for", audit.title);
                  }}
                />
              );
            })
          )}
        </div>

        {/* Divider */}
        <hr className="my-5 border-[var(--color-dap-border)]" />

        {/* RESOURCES Section */}
        <div className="text-[25px] font-bold text-[var(--color-dap-dark-heading)] tracking-[-0.19px]">
          RESOURCES
        </div>
        <div className="mt-3 flex flex-col gap-2 ">
          <a
            href="#"
            className="text-[var(--color-dap-orange)] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            {/* CHANGED THIS: Replaced ArrowSquareOut with ArrowUpRight */}
            UT Core Requirements <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            {/* CHANGED THIS: Replaced ArrowSquareOut with ArrowUpRight */}
            UT Degree Plans <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            {/* CHANGED THIS: Replaced ArrowSquareOut with ArrowUpRight */}
            Registration Info Sheet (RIS) <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
          >
            {/* CHANGED THIS: Replaced ArrowSquareOut with ArrowUpRight */}
            Register for Courses <ArrowUpRight size={14} />
          </a>
        </div>

        {/* Divider */}
        <hr className="my-5 border-[var(--color-dap-border)]" />

        {/* Feedback Link */}
        <a
          href="#"
          className="text-[var(--color-dap-orange)] font-semibold hover:underline flex items-center gap-1"
        >
          {/* CHANGED THIS: Replaced ArrowSquareOut with ArrowUpRight */}
          Send us Feedback! <ArrowUpRight size={14} />
        </a>
      </div>

      {/* Footer */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <img src={logo} alt="Longhorn Developers" className="w-12 h-12" />
          <div className="text-sm">
            <span className="text-[var(--color-dap-orange)] font-semibold">
              MADE WITH LOVE, BY
            </span>
            <br />
            <span className="text-[var(--color-dap-orange)] font-semibold">
              LONGHORN DEVELOPERS
            </span>
          </div>
        </div>
        {/* CHANGED THIS: Swapped justify-start for w-full to allow ml-auto to work */}
        <div className="flex items-center w-full gap-4 text-[var(--color-dap-dark)]">
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
          {/* CHANGED THIS: Added ml-auto to push Moon and Settings to the right */}
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
