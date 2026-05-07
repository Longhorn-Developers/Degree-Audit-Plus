import type { DegreeAuditCardProps } from "@/lib/general-types";
import {
  CopySimple,
  DotsThree,
  PencilSimpleLine,
  Trash,
} from "@phosphor-icons/react";
import React from "react";

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
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isSelected) {
      setMenuOpen(false);
    }
  }, [isSelected]);

  return (
    <div
      className={`relative rounded-[8px] px-4 py-[12px] w-full transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-dap-orange border border-dap-orange"
          : "bg-background border border-dap-border"
      }`}
      onClick={() => {
        setMenuOpen(false);
        onToggle?.();
      }}
    >
      <div className="flex items-center justify-between">
        {/* Title */}
        <div
          className={`font-bold text-[18px] leading-tight ${
            isSelected ? "text-white" : "text-dap-orange"
          }`}
        >
          {title}
        </div>

        <div className="flex items-center gap-2">
          {/* Percentage Badge */}
          <div
            className={`rounded-[8px] px-3 py-2 flex items-center justify-center ${
              isSelected ? "bg-background" : "bg-dap-orange"
            }`}
          >
            <span
              className={`text-base font-bold leading-tight ${
                isSelected ? "text-dap-orange" : "text-white"
              }`}
            >
              {percentage}%
            </span>
          </div>

          <button
            type="button"
            className={isSelected ? "text-white" : "text-dap-orange"}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
              onMenuClick?.();
            }}
            aria-label="Audit options"
          >
            <DotsThree size={22} weight="bold" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[180px] rounded-[8px] border border-dap-border bg-background p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] hover:bg-hover-bg">
            <PencilSimpleLine size={20} className="shrink-0" />
            <span>Rename</span>
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] hover:bg-hover-bg">
            <CopySimple size={20} className="shrink-0" />
            <span>Duplicate</span>
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] text-[#c63636] hover:bg-hover-bg">
            <Trash size={20} className="shrink-0" />
            <span>Delete Audit</span>
          </button>
        </div>
      )}
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
    <div className="bg-background rounded border border-dap-border px-3 py-[12px]  w-full transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div className="font-bold text-[18px] leading-tight text-dap-orange">
          {title}
        </div>

        {/* Percentage Badge */}
        <div className="bg-dap-orange rounded-md px-3 py-2 flex items-center justify-center">
          <span className="text-white text-base font-bold leading-tight">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default DegreeAuditCard;
