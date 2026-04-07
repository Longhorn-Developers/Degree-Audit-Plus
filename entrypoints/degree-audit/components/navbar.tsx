import {
  IconButton,
} from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import { useAuditContext } from "@/entrypoints/degree-audit/providers/audit-provider";
import { usePreferences } from "@/entrypoints/degree-audit/providers/preferences-provider";
import { ExportIcon, PencilIcon, Sidebar as SidebarIcon } from "@phosphor-icons/react";

const MAJOR_TAG_STYLES = [
  "bg-[#18a770] text-[#f3fff8]",
  "bg-[#5f66e7] text-[#f4f5ff]",
  "bg-[#1ca3a2] text-[#f2ffff]",
];

const MINOR_TAG_STYLES = [
  "bg-[#dff7fb] text-[#4ab8c7]",
  "bg-[#fdf4da] text-[#cfb55b]",
  "bg-[#fde8f5] text-[#cb8abf]",
  "bg-[#f2ebff] text-[#aa88d6]",
];

const Navbar = () => {
  const { toggleSidebar, toggleViewMode, viewMode, sidebarIsOpen } = usePreferences();
  const { history, currentAuditId } = useAuditContext();

  const currentAudit = history?.audits?.find(
    (a, i) => (a.auditId || String(i)) === currentAuditId,
  );

  const title = currentAudit?.title ?? "Degree Audit Plus";
  const majors = currentAudit?.majors ?? [];
  const minors = currentAudit?.minors ?? [];

  return (
    <HStack
      fill
      gap={8}
      x="between"
      y="middle"
      className="border-b border-gray-200 px-10 pt-4 pb-5"
    >
      {!sidebarIsOpen && (
        <button
          className="p-1 hover:bg-black/5 rounded shrink-0"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <SidebarIcon size={24} className="text-[var(--color-dap-dark-alt)]" />
        </button>
      )}
      <VStack gap={2} className="min-w-0 flex-1 pb-1">
        <h1 className="text-2xl font-bold text-black leading-tight truncate">
          {title}
        </h1>
        {majors.length > 0 && (
          <HStack gap={2} y="middle" className="flex-wrap">
            <span className="shrink-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#af6427]">
              MAJOR
            </span>
            <HStack gap={2} y="middle" className="flex-wrap">
              {majors.map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className={`inline-flex items-center rounded-[6px] px-2.5 py-[3px] text-[12px] font-medium leading-none ${
                    MAJOR_TAG_STYLES[i % MAJOR_TAG_STYLES.length]
                  }`}
                >
                  {m}
                </span>
              ))}
            </HStack>
          </HStack>
        )}

        {minors.length > 0 && (
          <HStack gap={2} y="middle" className="flex-wrap">
            <span className="shrink-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#af6427]">
              MINOR/CERT
            </span>
            <HStack gap={2} y="middle" className="flex-wrap">
              {minors.map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className={`inline-flex items-center rounded-[6px] px-2.5 py-[3px] text-[12px] font-medium leading-none ${
                    MINOR_TAG_STYLES[i % MINOR_TAG_STYLES.length]
                  }`}
                >
                  {m}
                </span>
              ))}
            </HStack>
          </HStack>
        )}
      </VStack>

      <HStack centered className="shrink-0 gap-3">
        <HStack centered gap={3}>
          <button
            type="button"
            role="switch"
            aria-checked={viewMode === "planner"}
            onClick={() => void toggleViewMode()}
            className="relative inline-flex h-5 w-9 items-center rounded-full border border-[#cfd5de] bg-white shadow-sm"
          >
            <span
              className={`inline-block h-[12px] w-[12px] transform rounded-full bg-[#97a7b4] transition-transform duration-200 ease-in-out ${
                viewMode === "planner" ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-[#363f43] whitespace-nowrap">
            Planner View
          </span>
        </HStack>
        <IconButton
          icon={<PencilIcon className="w-5 h-5" />}
          label="Edit Audit"
          className="h-10 rounded-[5px] px-[18px] bg-[#bf5701] gap-1.5 text-sm font-bold"
        />
        <IconButton
          icon={<ExportIcon className="w-5 h-5" />}
          label="Share"
          className="h-10 rounded-[5px] px-[18px] bg-[#bf5701] gap-1.5 text-sm font-bold"
        />
      </HStack>
    </HStack>
  );
};

export default Navbar;
