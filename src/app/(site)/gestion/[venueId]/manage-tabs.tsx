"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "turnos", label: "Turnos" },
  { segment: "canchas", label: "Canchas" },
  { segment: "datos", label: "Datos de la sede" },
] as const;

export function ManageTabs({ venueId }: { venueId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de la sede" className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = `/gestion/${venueId}/${tab.segment}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm whitespace-nowrap no-underline transition-colors duration-150",
              active ? "border-coral font-semibold text-text" : "border-transparent text-text-2 hover:text-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
