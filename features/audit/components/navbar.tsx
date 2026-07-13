import { IconButton } from "@/components/ui/button";
import { HStack, VStack } from "@/components/ui/stack";
import { usePreferences } from "@/features/preferences/preferences-provider";
import { useAuditContext } from "../audit-provider";
import { cn } from "@/lib/utils";
import {
  ExportIcon,
  MoonIcon,
  PencilIcon,
  Sidebar as SidebarIcon,
  SunIcon,
} from "@phosphor-icons/react";

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
  const {
    toggleSidebar,
    toggleViewMode,
    viewMode,
    sidebarIsOpen,
    toggleDarkMode,
    isDarkMode,
  } = usePreferences();
  const { currentAudit } = useAuditContext();

  const title = currentAudit?.title ?? "Degree Audit Plus";
  const majors = currentAudit?.majors ?? [];
  const minors = currentAudit?.minors ?? [];

  return (
    <HStack
      fill
      gap={8}
      x="between"
      y="middle"
      className="sticky top-0 z-10 bg-background border-b border-gray-200 px-10 pt-4 pb-5"
    >
      {!sidebarIsOpen && (
        <button
          className="p-1 hover:bg-black/5 rounded shrink-0"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <SidebarIcon size={24} />
        </button>
      )}
      <VStack gap={2} className="min-w-0 flex-1 pb-1">
        <h1 className="text-2xl font-bold leading-tight truncate">{title}</h1>
        {majors.length > 0 && (
          <HStack gap={2} y="middle" className="flex-wrap">
            <span className="shrink-0 text-[13px] font-bold uppercase tracking-[0.04em] text-dap-orange">
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
            <span className="shrink-0 text-[13px] font-bold uppercase tracking-[0.04em] text-dap-orange">
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
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full border shadow-sm transition-all duration-200 ease-in-out border-gray-200",
              viewMode === "planner"
                ? "bg-dap-primary border-background"
                : "bg-background border-[#97a7b4]",
            )}
          >
            <span
              className={cn(
                "inline-block h-[12px] w-[12px] transform rounded-full transition-transform duration-200 ease-in-out",
                viewMode === "planner"
                  ? "bg-background translate-x-[18px]"
                  : "bg-muted translate-x-[3px]",
              )}
            />
          </button>
          <span className="text-sm font-medium whitespace-nowrap">
            Planner View
          </span>
        </HStack>
        <IconButton
          icon={<PencilIcon className="w-5 h-5" />}
          label="Edit Audit"
          className="h-10 rounded-[5px] px-[18px] bg-dap-orange gap-1.5 text-sm font-bold"
        />
        <IconButton
          icon={<ExportIcon className="w-5 h-5" />}
          label="Share"
          className="h-10 rounded-[5px] px-[18px] bg-dap-orange gap-1.5 text-sm font-bold"
        />
        <IconButton
          icon={isDarkMode() ? <MoonIcon size={24} /> : <SunIcon size={24} />}
          label={isDarkMode() ? "Light Mode" : "Dark Mode"}
          onClick={toggleDarkMode}
          className="h-10 rounded-[5px] px-[18px] bg-dap-orange gap-1.5 text-sm font-bold"
        />
      </HStack>
    </HStack>
  );
};

export default Navbar;
