import type { AuditHistoryEntry } from "@/domain/audit";

export default function PopupAuditCard({
  title = "Degree Audit 1",
  percentage = 90,
}: Pick<AuditHistoryEntry, "title" | "percentage">) {
  return (
    <div className="w-full cursor-pointer rounded border border-dap-border bg-background px-3 py-3 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold leading-tight text-dap-orange">
          {title}
        </div>
        <div className="flex items-center justify-center rounded-md bg-dap-orange px-3 py-2">
          <span className="text-base font-bold leading-tight text-white">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
