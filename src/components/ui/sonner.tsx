"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos del handoff: éxito en salvia (accent-2-100), atención en terracota (accent-100).
// La app es solo tema claro.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-neutral-100)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "transparent",
          "--success-bg": "var(--color-accent-2-100)",
          "--success-text": "var(--color-accent-2-900)",
          "--success-border": "transparent",
          "--error-bg": "var(--color-accent-100)",
          "--error-text": "var(--color-accent-900)",
          "--error-border": "transparent",
          "--warning-bg": "var(--color-accent-100)",
          "--warning-text": "var(--color-accent-900)",
          "--warning-border": "transparent",
          "--border-radius": "18px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans text-sm shadow-md",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
