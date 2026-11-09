import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// <select> nativo con el look de Input (píldora de 44px): teclado y lector de pantalla sin trabajo extra.
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-border-input bg-surface pr-9 pl-3.5 text-sm text-text transition-colors duration-150 ease-out hover:border-navy focus-visible:border-coral focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-45"
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-text-3" />
    </div>
  );
}
