import type { AuditHistoryEntry } from "@/domain/audit";
import { SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function PopupAuditCard({
  title = "Degree Audit 1",
  percentage = 90,
  pending = false,
}: Pick<AuditHistoryEntry, "title" | "percentage"> & { pending?: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded border border-dap-border bg-background px-3 py-3 transition-all duration-200",
        pending ? "cursor-default opacity-60" : "cursor-pointer",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold leading-tight text-dap-orange">
          {title}
        </div>
        <div className="flex items-center justify-center rounded-md bg-dap-orange px-3 py-2">
          {pending ? (
            <SpinnerIcon size={20} className="animate-spin text-white" />
          ) : (
            <span className="text-base font-bold leading-tight text-white">
              {percentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
