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
        <div
          className={`font-bold text-[18px] leading-tight ${
            isSelected ? "text-white" : "text-[var(--color-dap-orange)]"
          }`}
        >
          {title}
        </div>

        {/* Percentage Badge */}
        <div
          className={`rounded-md px-3 py-2 flex items-center justify-center ${
            isSelected ? "bg-white" : "bg-[var(--color-dap-orange)]"
          }`}
        >
          <span
            className={`text-base font-bold leading-tight ${
              isSelected ? "text-[var(--color-dap-orange)]" : "text-white"
            }`}
          >
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
    <div className="bg-[var(--color-dap-stone-50)] rounded-sm border-2 border-[var(--color-dap-border)] px-4 py-3 w-full transition-all duration-200 hover:bg-[#FFF7ED] hover:border-2 hover:border-[#F9E7D5] cursor-pointer">
      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="font-bold text-[18px] leading-[20px] text-[var(--color-dap-primary)] tracking-[0.13px] overflow-hidden text-ellipsis whitespace-nowrap">
          {title}
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {/* Majors */}
            {majors && majors.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-[11px] leading-[12px] text-black">
                  Major:
                </span>
                <div className="flex gap-1 flex-wrap">
                  {majors.map((major, index) => (
                    <Tag key={index} index={index} major={major} type="major" />
                  ))}
                </div>
              </div>
            )}

            {/* Minors/Certs */}
            {minors && minors.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-[11px] leading-[12px] text-black">
                  Minor/cert:
                </span>
                <div className="flex gap-1 flex-wrap">
                  {minors.map((minor, index) => (
                    <Tag key={index} index={index} major={minor} type="minor" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Percentage */}
          <div className="bg-[var(--color-dap-orange)] rounded-md px-2 py-1 h-[30px] flex items-center justify-center">
            <span className="text-white text-base font-bold leading-[22px]">
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DegreeAuditCard;
