import { CaretDownIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SelectDropdownProps = {
  icon?: React.ReactNode;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// A dropdown you can type into. Typing filters the options; Enter picks the
// first match; clearing the text clears the value.
export default function SelectDropdown({
  icon,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  const select = (option: string) => {
    onChange(option);
    close();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-3">
      {icon && <div className="text-gray-500">{icon}</div>}
      <div className="flex-1 relative">
        <input
          type="text"
          value={isOpen ? query : value}
          placeholder={value || placeholder}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setIsOpen(true);
            setQuery(event.target.value);
            if (event.target.value === "") onChange("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
            if (event.key !== "Enter") return;
            // Keep Enter from submitting the form around us.
            event.preventDefault();
            if (matches[0]) select(matches[0]);
          }}
          className={cn(
            "w-full px-3 py-2 pr-10 border border-dap-border rounded-lg text-base bg-background text-text placeholder:text-gray-500 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            isOpen && "ring-2 ring-dap-orange border-transparent",
          )}
        />
        <CaretDownIcon
          size={20}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform pointer-events-none",
            isOpen && "rotate-180",
          )}
        />

        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-background border border-dap-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            <div className="p-2 space-y-1">
              {matches.length === 0 ? (
                <p className="px-4 py-3 text-base text-gray-500">No matches</p>
              ) : (
                matches.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => select(option)}
                    className="w-full text-left px-4 py-3 rounded-lg text-base transition-colors text-text hover:bg-hover-bg"
                  >
                    {option}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
