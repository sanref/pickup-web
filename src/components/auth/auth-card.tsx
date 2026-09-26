import Link from "next/link";
import { cn } from "@/lib/utils";

// Tarjeta del handoff v3: 460px (620px en onboarding), padding 36/34, radio 24px, borde edge y sombra xl.
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
        "flex w-full flex-col gap-[18px] rounded-[24px] border border-edge bg-surface px-6 py-8 shadow-xl sm:px-[34px] sm:py-9",
        wide ? "max-w-[620px] gap-5" : "max-w-[460px]",
      )}
    >
      {showBrand && (
        <Link href="/" className="w-fit font-display text-[23px] leading-none text-navy no-underline">
          PickUp
        </Link>
      )}
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[29px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
        {description && <p className="m-0 text-sm text-text-2">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function OrDivider({ children = "o con tu email" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-text-3">
      <div className="h-px flex-1 bg-border" />
      {children}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FormMessage({ kind, children }: { kind: "error" | "notice"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-sm px-4 py-3 text-sm",
        kind === "error" ? "bg-coral-100 text-coral-700" : "bg-coral-100 text-navy",
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
      <label htmlFor={id} className="text-xs text-text-3">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-text-3">{hint}</span>}
    </div>
  );
}
