import {
  IconButton,
  ToggleSwitch,
} from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import { useAuditContext } from "@/entrypoints/degree-audit/providers/audit-provider";
import { usePreferences } from "@/entrypoints/degree-audit/providers/preferences-provider";
import { ExportIcon, PencilIcon } from "@phosphor-icons/react";

const MAJOR_TAG_STYLES = [
  "bg-[#13b981] text-white",
  "bg-[#6467f1] text-white",
  "bg-[#0d9488] text-white",
];

const MINOR_TAG_STYLES = [
  "bg-[#ccfbfe] text-[#59cbdb]",
  "bg-amber-50 text-amber-800",
  "bg-pink-50 text-pink-800",
  "bg-violet-50 text-violet-800",
];

const Navbar = () => {
  const { toggleSidebar, toggleViewMode, viewMode } = usePreferences();
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
      className="border-b border-gray-200 px-10 pt-4 pb-6"
    >
      <VStack gap={3} className="min-w-0 flex-1 pb-1">
        <h1 className="text-2xl font-bold text-black leading-tight truncate">
          {title}
        </h1>
        {majors.length > 0 && (
          <HStack gap={4} y="middle" className="flex-wrap">
            <span className="shrink-0 text-[15px] font-bold uppercase tracking-wide text-[#b36928]">
              MAJOR
            </span>
            <HStack gap={3} y="middle" className="flex-wrap">
              {majors.map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className={`inline-flex items-center rounded-[6px] px-3 py-1 text-[13px] font-medium leading-none ${
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
          <HStack gap={4} y="middle" className="flex-wrap">
            <span className="shrink-0 text-[15px] font-bold uppercase tracking-wide text-[#b36928]">
              MINOR/CERT
            </span>
            <HStack gap={3} y="middle" className="flex-wrap">
              {minors.map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className={`inline-flex items-center rounded-[6px] px-3 py-1 text-[13px] font-medium leading-none ${
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

      <HStack centered className="shrink-0 gap-4">
        <HStack centered gap={8}>
          <ToggleSwitch
            onChange={() => void toggleViewMode()}
            checked={viewMode === "planner"}
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">
            Planner View
          </span>
        </HStack>
        <IconButton
          icon={<PencilIcon className="w-5 h-5" />}
          label="Edit Audit"
          onClick={() => void toggleSidebar()}
        />
        <IconButton
          icon={<ExportIcon className="w-5 h-5" />}
          label="Share"
        />
      </HStack>
    </HStack>
  );
};

export default Navbar;
