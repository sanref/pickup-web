import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import { cn } from "@/lib/utils";

// Barra de cupo del handoff: relleno accent-2-400 hasta el 70%, accent-2 por encima, accent-2-700 al 100%.
// La opción que va ganando usa track accent-2-300 y relleno accent-2-600.
export function CapacityBar({
  value,
  capacity,
  leading = false,
  className,
}: {
  value: number;
  capacity: number;
  leading?: boolean;
  className?: string;
}) {
  const ratio = Math.min(1, capacity > 0 ? value / capacity : 0);
  const fill = leading ? "bg-accent-2-600" : ratio >= 1 ? "bg-accent-2-700" : ratio > 0.7 ? "bg-accent-2" : "bg-accent-2-400";
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={value}
      aria-label={`${value} de ${capacity}`}
      className={cn("h-[7px] w-full overflow-hidden rounded-full", leading ? "bg-accent-2-300" : "bg-neutral-300", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", fill)} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

const STATUS: Record<string, { label: string; variant: "accent-2" | "neutral" | "outline" }> = {
  draft: { label: "Borrador", variant: "neutral" },
  open: { label: "En votación", variant: "accent-2" },
  confirmed: { label: "Confirmado", variant: "accent-2" },
  played: { label: "Jugado", variant: "neutral" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

export function StatusTag({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// Siempre tag terracota; singular y plural.
export function MissingCount({ missing }: { missing: number }) {
  if (missing <= 0) return null;
  return <Badge variant="accent">{missing === 1 ? "falta 1" : `faltan ${missing}`}</Badge>;
}

export function VoteMark({ voted, className }: { voted: boolean; className?: string }) {
  return voted ? (
    <span className={cn("grid size-[26px] place-items-center rounded-full bg-accent-2-400 text-accent-2-900", className)} aria-label="Le sirve">
      <Check className="size-3.5" strokeWidth={2.75} />
    </span>
  ) : (
    <span className={cn("size-2 rounded-full bg-neutral-300", className)} aria-label="No le sirve" />
  );
}

export function AvatarStack({
  people,
  max = 5,
}: {
  people: { userId: string; displayName: string; avatarUrl: string | null }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <UserAvatar
          key={p.userId}
          name={p.displayName}
          src={p.avatarUrl}
          className={cn("size-[26px] border-2 border-background", i > 0 && "-ml-2")}
          textClassName="text-[10px]"
        />
      ))}
      {rest > 0 && (
        <span className="-ml-2 grid size-[26px] place-items-center rounded-full border-2 border-background bg-neutral-300 text-[10px] font-semibold">
          +{rest}
        </span>
      )}
    </div>
  );
}
