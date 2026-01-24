import React from "react";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "~/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
type ModalPosition = "center" | "top" | "bottom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: ModalSize;
  position?: ModalPosition;
  showHeader?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full w-[90vw]",
};

const positionClasses: Record<ModalPosition, string> = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-20",
  bottom: "items-end justify-center pb-20",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
  position = "center",
  showHeader = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-black/50",
        positionClasses[position]
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-white rounded-lg shadow-xl w-full mx-4 overflow-hidden",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-[var(--color-dap-dark)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <XIcon size={24} className="text-gray-600" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn(showHeader ? "p-4" : "p-0")}>{children}</div>
      </div>
    </div>
  );
}
