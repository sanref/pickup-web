"use client";

import { cn } from "@/lib/utils";

// Control segmentado del handoff: grupo pill con divisorias de 1px, opción elegida en navy.
// Radios nativos para que el teclado y los lectores de pantalla funcionen sin trabajo extra.
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
  size = "md",
  orientation = "horizontal",
}: {
  name: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  /** Vertical: opciones apiladas con divisorias horizontales (filtros de /explorar). */
  orientation?: "horizontal" | "vertical";
}) {
  const vertical = orientation === "vertical";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-orientation={orientation}
      className={cn(
        "inline-flex overflow-hidden border border-border-input bg-surface",
        vertical ? "w-full flex-col rounded-sm" : "w-fit rounded-full",
      )}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative inline-flex min-h-11 cursor-pointer items-center px-3 transition-colors duration-150 ease-out sm:min-h-0",
              size === "sm" ? "py-1.5 text-xs" : "py-[7px] text-[13px]",
              vertical ? "[&+&]:border-t [&+&]:border-border-input" : "[&+&]:border-l [&+&]:border-border-input",
              "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-coral",
              checked ? "bg-navy font-semibold text-surface" : "text-text-2 hover:bg-navy/6",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="pointer-events-none absolute size-0 opacity-0"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
