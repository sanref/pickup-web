import Link from "next/link";
import { cn } from "@/lib/utils";

// Tarjeta del handoff: 460px (620px en onboarding), padding 36/34, radio 28px, sombra lg.
export function AuthCard({
  title,
  description,
  wide = false,
  showBrand = true,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  wide?: boolean;
  showBrand?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-[18px] rounded-lg bg-background px-6 py-8 shadow-lg sm:px-[34px] sm:py-9",
        wide ? "max-w-[620px] gap-5" : "max-w-[460px]",
      )}
    >
      {showBrand && (
        <Link href="/" className="w-fit font-heading text-[26px] leading-none text-foreground no-underline">
          PickUp
        </Link>
      )}
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-heading text-[30px] leading-tight">{title}</h1>
        {description && <p className="m-0 text-sm text-neutral-800">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function OrDivider({ children = "o con tu email" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-neutral-600">
      <div className="h-px flex-1 bg-neutral-300" />
      {children}
      <div className="h-px flex-1 bg-neutral-300" />
    </div>
  );
}

export function FormMessage({ kind, children }: { kind: "error" | "notice"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md px-4 py-3 text-sm",
        kind === "error" ? "bg-accent-100 text-accent-800" : "bg-accent-2-100 text-accent-2-800",
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label htmlFor={id} className="text-xs text-foreground/70">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-neutral-700">{hint}</span>}
    </div>
  );
}
