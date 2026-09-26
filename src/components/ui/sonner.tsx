"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Avisos del handoff v2: toast en píldora, navy para éxito y coral-100 para info.
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
          "--normal-bg": "var(--color-coral-100)",
          "--normal-text": "var(--color-navy)",
          "--normal-border": "transparent",
          "--success-bg": "var(--color-navy)",
          "--success-text": "var(--color-surface)",
          "--success-border": "transparent",
          "--error-bg": "var(--color-coral-100)",
          "--error-text": "var(--color-coral-700)",
          "--error-border": "transparent",
          "--warning-bg": "var(--color-coral-100)",
          "--warning-text": "var(--color-coral-700)",
          "--warning-border": "transparent",
          "--border-radius": "999px",
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
