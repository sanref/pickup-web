"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  variant,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={pending} aria-busy={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
