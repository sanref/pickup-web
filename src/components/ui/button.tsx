import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Botones v2: píldora de 44px, texto de 14px en Familjen Grotesk (Graduate no se usa acá).
// primary = coral con texto navy (una acción por pantalla), navy = acción de navegación,
// outline = contorno sobre fondo claro, outline-light = contorno sobre la barra navy.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent text-sm font-semibold leading-[1.2] whitespace-nowrap transition-colors duration-150 ease-out select-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-coral text-navy hover:bg-coral-hover",
        navy: "bg-navy text-surface hover:bg-navy-600",
        outline:
          "border-border-input bg-transparent text-navy hover:border-navy",
        "outline-light":
          "border-navy-300 bg-transparent text-surface hover:border-surface",
        ghost:
          "px-3 text-navy hover:bg-[color-mix(in_srgb,var(--color-navy)_8%,transparent)] active:bg-[color-mix(in_srgb,var(--color-navy)_14%,transparent)]",
        destructive:
          "px-2 text-[13px] text-coral-700 hover:bg-[color-mix(in_srgb,var(--color-coral)_10%,transparent)]",
        link: "px-0 text-coral-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
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
