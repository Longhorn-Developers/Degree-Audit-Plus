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
      className={`!rounded-lg px-4 py-3 w-full transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-[rgba(248,151,31,0.25)]"
          : "bg-white border border-[#eae8e1]"
      }`}
      onClick={onToggle}
    >
      <div className="flex flex-col gap-2">
        {/* Header Row: Caret + Title + Menu + Percentage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <CaretUp size={16} weight="bold" className="text-[#1a2024]" />
            ) : (
              <CaretDown size={16} weight="bold" className="text-[#1a2024]" />
            )}
            <span className="font-bold text-[13px] leading-[18px] text-[#1a2024] tracking-[0.13px] overflow-hidden text-ellipsis whitespace-nowrap">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick?.();
              }}
              className="p-1 hover:bg-black/5 rounded"
            >
              <DotsThree size={20} weight="bold" className="text-[#1a2024]" />
            </button>
            <div className="bg-[#bf5700] px-2 py-1 rounded h-[26px] flex items-center justify-center">
              <span className="text-white text-sm font-bold leading-[18px]">
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Tags Section - Only visible when expanded */}
        {isExpanded && (
          <div className="flex flex-col gap-2 ml-6">
            {/* Majors */}
            {majors && majors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {majors.map((major, index) => (
                  <Tag key={index} index={index} major={major} type="major" />
                ))}
              </div>
            )}

            {/* Minors/Certs */}
            {minors && minors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {minors.map((minor, index) => (
                  <Tag key={index} index={index} major={minor} type="minor" />
                ))}
              </div>
            )}
          </div>
        )}
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
    <div className="bg-[#f1f5f9] rounded-sm px-4 py-3 w-full transition-all duration-200 hover:bg-[#e2e8f0] cursor-pointer">
      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="font-bold text-[13px] leading-[18px] text-[#1a2024] tracking-[0.13px] overflow-hidden text-ellipsis whitespace-nowrap">
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
          <div className="bg-[#bf5700] rounded-md px-2 py-1 h-[30px] flex items-center justify-center">
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
