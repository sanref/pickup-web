import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Botones Organic: siempre en píldora, texto en Caprasimo 14px, alto 44px.
// primary = terracota (una acción principal por pantalla), secondary = contorno, ghost = texto terracota.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent font-heading text-sm leading-[1.2] whitespace-nowrap transition-colors duration-150 ease-out select-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-background hover:bg-accent-600 active:bg-accent-700",
        secondary:
          "border-divider bg-transparent text-foreground hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--foreground)_14%,transparent)]",
        ghost:
          "px-(--space-2) text-accent hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]",
        destructive:
          "px-(--space-2) font-sans text-[13px] text-accent-700 hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
        link: "px-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    compoundVariants: [
      { variant: "ghost", size: "default", className: "px-(--space-3)" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
