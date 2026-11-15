"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface SelectOption {
  id: string;
  label: string;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  placeholder: string;
  fullWidth?: boolean;
  hasError?: boolean;
}

const triggerClassName =
  "flex w-full cursor-pointer items-center gap-2 rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-[15px] font-bold text-ink transition-colors hover:border-[#B3452E] focus:border-[#B3452E] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`ml-auto flex-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0A290"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SelectDropdown({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder,
  fullWidth = false,
  hasError = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Escape en el contenedor (no en window): el menú se cierra sin que el
  // Escape llegue a los modales, que también escuchan en window.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
    }
  }

  const selectedOption = options.find((option) => option.id === value);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative w-full ${fullWidth ? "" : "flex-none sm:w-[168px]"}`}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={`${triggerClassName} ${hasError ? "border-[#D9583C]" : "border-[#EADFD0]"}`}
      >
        {selectedOption?.label ?? placeholder}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 left-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[16px] border border-[#ECE0D0] bg-[#FBF4EC] p-1.5 shadow-[0_16px_36px_-16px_rgba(63,54,46,0.28)]"
        >
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <li key={option.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`w-full cursor-pointer rounded-[12px] px-3.5 py-2.5 text-left text-[15px] font-bold transition-colors ${
                    isSelected
                      ? "bg-accent-ghost text-accent"
                      : "text-ink hover:bg-[#F4ECE1]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
