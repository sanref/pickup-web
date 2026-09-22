"use client";

import { cn } from "@/lib/utils";

// Control segmentado del handoff (.seg): grupo pill con divisorias internas, opción elegida en terracota.
// Radios nativos para que el teclado y los lectores de pantalla funcionen sin trabajo extra.
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  name: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-fit overflow-hidden rounded-full border border-divider">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative inline-flex min-h-11 cursor-pointer items-center px-3 transition-colors duration-150 ease-out sm:min-h-0",
              size === "sm" ? "py-1.5 text-xs" : "py-[7px] text-[13px]",
              "[&+&]:border-l [&+&]:border-divider",
              "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-accent",
              checked ? "bg-accent text-background" : "hover:bg-foreground/7",
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
