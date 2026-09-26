import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Tags v3: píldora de 11-12px. coral = empuja a actuar ("faltan 3"),
// navy = estructura y estados ya resueltos, neutral = informativo, outline = cancelado.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-[3px] text-[11px] leading-normal whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        coral: "bg-coral font-semibold text-navy",
        "coral-soft": "bg-coral-100 text-navy",
        navy: "bg-navy text-navy-200",
        neutral: "tag-neutral",
        outline: "border-border-input text-text-3",
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
