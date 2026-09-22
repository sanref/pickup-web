import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Tags Organic: píldora de 11px. accent = empuja a actuar ("faltan 3"),
// accent-2 = resuelto (confirmado, en votación), neutral = informativo, outline = cancelado.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-[3px] text-[11px] leading-normal tracking-[0.02em] whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        accent: "bg-accent-100 text-accent-800",
        "accent-2": "bg-accent-2-100 text-accent-2-800",
        neutral: "bg-neutral-100 text-neutral-800",
        outline: "border-accent text-accent",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
