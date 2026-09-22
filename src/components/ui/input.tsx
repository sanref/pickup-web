import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-full border border-divider bg-surface px-3.5 text-sm text-foreground caret-accent transition-colors duration-150 ease-out file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-600 hover:border-[color-mix(in_srgb,var(--foreground)_45%,transparent)] focus-visible:border-accent focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
