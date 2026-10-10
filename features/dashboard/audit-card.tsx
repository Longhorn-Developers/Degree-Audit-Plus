import {
  CopySimple,
  DotsThree,
  PencilSimpleLine,
  PushPin,
  Trash,
} from "@phosphor-icons/react";
import type { ActionResult } from "@/lib/browser/messages";
import React from "react";

export interface DegreeAuditCardProps {
  title?: string;
  percentage?: number;
  isSelected?: boolean;
  isPinned?: boolean;
  onToggle?: () => void;
  onRename?: (title: string) => void;
  onDelete?: () => Promise<ActionResult>;
  onTogglePin?: () => void;
}

/**
 * Sidebar variant - collapsible with caret icons and menu dots
 */
const DegreeAuditCard: React.FC<DegreeAuditCardProps> = ({
  title,
  percentage,
  isSelected = false,
  isPinned = false,
  onToggle,
  onRename,
  onDelete,
  onTogglePin,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title ?? "");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const closeMenu = () => setMenuOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menuOpen]);

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

  // Confirms, deletes on UT and locally, and shows an inline error on failure.
  const handleDelete = async () => {
    if (
      !onDelete ||
      !window.confirm(
        "Delete this audit from Degree Audit Plus and UT Direct? Duplicate runs of it on UT Direct are deleted too. This can't be undone.",
      )
    )
      return;

    setIsDeleting(true);
    const result = await onDelete();
    setIsDeleting(false);
    setMenuOpen(false);
    if (result.ok) return;

    // the background already opened a login tab for AUTH_REQUIRED
    setDeleteError(
      result.error === "AUTH_REQUIRED"
        ? "Log in to UT Direct and try again."
        : "Could not delete this audit. Please try again.",
    );
  };

  return (
    <div>
      <div
        ref={cardRef}
        className={`relative rounded-[8px] px-4 py-[12px] w-full transition-all duration-200 cursor-pointer ${
          isSelected
            ? "bg-dap-orange border border-dap-orange"
            : "bg-surface border border-dap-border"
        }`}
        onClick={() => {
          setMenuOpen(false);
          onToggle?.();
        }}
      >
        <div className="flex items-center justify-between gap-6">
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
                setDeleteError("");
                const bounds = cardRef.current?.getBoundingClientRect();
                if (!menuOpen && bounds) {
                  setMenuPosition({
                    top: bounds.bottom + 8,
                    right: window.innerWidth - bounds.right,
                  });
                }
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
            className="fixed z-30 min-w-[180px] rounded-[8px] border border-dap-border bg-background p-2 shadow-lg"
            style={menuPosition}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] hover:bg-hover-bg"
              onClick={onTogglePin}
            >
              <PushPin size={20} className="shrink-0" />
              <span>{isPinned ? "Unpin" : "Pin"}</span>
            </button>
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
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] text-dap-delete hover:bg-hover-bg disabled:opacity-50"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash size={20} className="shrink-0" />
              <span>{isDeleting ? "Deleting..." : "Delete Audit"}</span>
            </button>
          </div>
        )}
      </div>
      {deleteError ? (
        <p className="whitespace-normal px-1 pt-1 text-sm text-red-700">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
};

export default DegreeAuditCard;
