import React from "react";
import Tag from "./common/tag";
import type { DegreeAuditCardProps } from "@/lib/general-types";
import { CaretUp, CaretDown, DotsThree } from "@phosphor-icons/react";

/**
 * Sidebar variant - collapsible with caret icons and menu dots
 */
const DegreeAuditCard: React.FC<DegreeAuditCardProps> = ({
  title = "Degree Audit 1",
  majors = ["Informatics", "Design"],
  minors = ["Business"],
  percentage = 90,
  isSelected = false,
  isExpanded = false,
  onToggle,
  onMenuClick,
}) => {
  return (
    <div
      className={`!rounded px-3 py-[12px] w-full transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-[var(--color-dap-orange)] border border-[var(--color-dap-orange)]"
          : "bg-[#FAFAF9] border border-[var(--color-dap-border)]"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        {/* Title */}
        <div className={`font-bold text-[18px] leading-tight ${
          isSelected ? "text-white" : "text-[var(--color-dap-orange)]"
        }`}>
          {title}
        </div>

        {/* Percentage Badge */}
        <div className={`rounded-md px-3 py-2 flex items-center justify-center ${
          isSelected
            ? "bg-white"
            : "bg-[var(--color-dap-orange)]"
        }`}>
          <span className={`text-base font-bold leading-tight ${
            isSelected ? "text-[var(--color-dap-orange)]" : "text-white"
          }`}>
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Popup variant
 */
export const DegreeAuditCardPopup: React.FC<DegreeAuditCardProps> = ({
  title = "Degree Audit 1",
  majors = ["Informatics", "Design"],
  minors = ["Business"],
  percentage = 90,
}) => {
  return (
    <div className="bg-[#FAFAF9] rounded border border-[var(--color-dap-border)] px-3 py-[12px]  w-full transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div className="font-bold text-[18px] leading-tight text-[var(--color-dap-orange)]">
          {title}
        </div>

        {/* Percentage Badge */}
        <div className="bg-[var(--color-dap-orange)] rounded-md px-3 py-2 flex items-center justify-center">
          <span className="text-white text-base font-bold leading-tight">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default DegreeAuditCard;
