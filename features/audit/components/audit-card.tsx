import {
  CopySimple,
  DotsThree,
  PencilSimpleLine,
  Trash,
} from "@phosphor-icons/react";
import React from "react";

export interface DegreeAuditCardProps {
  title?: string;
  percentage?: number;
  isSelected?: boolean;
  onToggle?: () => void;
  onRename?: (title: string) => void;
}

/**
 * Sidebar variant - collapsible with caret icons and menu dots
 */
const DegreeAuditCard: React.FC<DegreeAuditCardProps> = ({
  title,
  percentage,
  isSelected = false,
  onToggle,
  onRename,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title ?? "");

  React.useEffect(() => {
    if (!isSelected) {
      setMenuOpen(false);
    }
  }, [isSelected]);

  const saveRename = () => {
    const nextTitle = draftTitle.trim();
    setIsEditing(false);
    setMenuOpen(false);

    if (nextTitle && nextTitle !== title) {
      onRename?.(nextTitle);
    } else {
      setDraftTitle(title ?? "");
    }
  };

  const startRename = () => {
    setDraftTitle(title ?? "");
    setIsEditing(true);
    setMenuOpen(false);
  };

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
        {isEditing ? (
          <input
            autoFocus
            className="w-[160px] rounded border border-dap-border bg-background px-1 py-1 text-[18px] font-bold leading-tight text-text outline-none"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={saveRename}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setDraftTitle(title ?? "");
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <div
            className={`min-w-0 flex-1 truncate font-bold text-[18px] leading-tight ${
              isSelected ? "text-white" : "text-dap-orange"
            }`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startRename();
            }}
          >
            {title}
          </div>
        )}

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
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] hover:bg-hover-bg"
            onClick={startRename}
          >
            <PencilSimpleLine size={20} className="shrink-0" />
            <span>Rename</span>
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] hover:bg-hover-bg">
            <CopySimple size={20} className="shrink-0" />
            <span>Duplicate</span>
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] text-dap-delete hover:bg-hover-bg">
            <Trash size={20} className="shrink-0" />
            <span>Delete Audit</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DegreeAuditCard;
