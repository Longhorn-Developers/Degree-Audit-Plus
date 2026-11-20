import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-md border border-dap-border shadow-2xl w-full max-w-[550px] max-h-[90vh] mx-4 overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-7 pt-7 pb-7">
          <h2 className="text-3xl leading-none font-bold text-text mb-8">
            {title}
          </h2>
          {children}
          {footer ? (
            <div className="mt-8 flex justify-end gap-3">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
