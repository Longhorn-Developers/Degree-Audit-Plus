import { CaretDown } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { cn } from "~/lib/utils";

type SelectDropdownProps = {
  icon?: React.ReactNode;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function SelectDropdown({
  icon,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-3">
      {icon && <div className="text-gray-500">{icon}</div>}
      <div className="flex-1 relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 border border-dap-border rounded-lg text-base bg-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            isOpen && "ring-2 ring-dap-orange border-transparent",
          )}
        >
          <span className={value ? "text-gray-900" : "text-gray-500"}>
            {value || placeholder}
          </span>
          <CaretDown
            size={20}
            className={cn(
              "text-gray-500 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-dap-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            <div className="p-2 space-y-1">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-base transition-colors",
                    value === option
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
