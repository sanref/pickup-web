import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import { cn } from "@/lib/utils";

// Barra de cupo del handoff v2: track neutral-200; relleno navy-300 hasta 70%,
// navy-600 por encima, navy al 100%. Dentro de la cabecera de la grilla el track
// es translúcido sobre navy ("on-navy") o sobre la columna ganadora ("on-coral").
export function CapacityBar({
  value,
  capacity,
  tone = "default",
  className,
}: {
  value: number;
  capacity: number;
  tone?: "default" | "on-navy" | "on-coral";
  className?: string;
}) {
  const ratio = Math.min(1, capacity > 0 ? value / capacity : 0);
  const track =
    tone === "on-navy" ? "bg-[rgba(244,242,236,.18)]" : tone === "on-coral" ? "bg-[rgba(18,37,68,.2)]" : "bg-neutral-200";
  const fill =
    tone === "on-navy" ? "bg-navy-300" : tone === "on-coral" ? "bg-navy" : ratio >= 1 ? "bg-navy" : ratio > 0.7 ? "bg-navy-600" : "bg-navy-300";
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={value}
      aria-label={`${value} de ${capacity}`}
      className={cn("h-[7px] w-full overflow-hidden rounded-full", track, className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", fill)} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

const STATUS: Record<string, { label: string; variant: "coral-soft" | "navy" | "neutral" | "outline" }> = {
  draft: { label: "Borrador", variant: "neutral" },
  open: { label: "En votación", variant: "coral-soft" },
  confirmed: { label: "Confirmado", variant: "navy" },
  played: { label: "Jugado", variant: "neutral" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

export function StatusTag({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export const missingText = (missing: number) => (missing === 1 ? "falta 1" : `faltan ${missing}`);

// Siempre tag coral con texto navy; singular y plural.
export function MissingCount({ missing }: { missing: number }) {
  if (missing <= 0) return null;
  return (
    <Badge variant="coral" className="tabular">
      {missingText(missing)}
    </Badge>
  );
}

export function VoteMark({ voted, className }: { voted: boolean; className?: string }) {
  return voted ? (
    <span className={cn("grid size-[23px] place-items-center rounded-full bg-navy-600 text-surface", className)} aria-label="Le sirve">
      <Check className="size-3.5" />
    </span>
  ) : (
    <span className={cn("size-[7px] rounded-full bg-[#ccd2cd]", className)} aria-label="No le sirve" />
  );
}

// El borde de cada avatar toma el color de lo que hay detrás (`edgeClassName`), para que se lean superpuestos.
export function AvatarStack({
  people,
  max = 5,
  total = people.length,
  edgeClassName = "border-background",
}: {
  people: { userId: string; displayName: string; avatarUrl: string | null }[];
  max?: number;
  /** Cantidad real si `people` trae solo los primeros. */
  total?: number;
  edgeClassName?: string;
}) {
  const shown = people.slice(0, max);
  const rest = total - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <UserAvatar
          key={p.userId}
          name={p.displayName}
          src={p.avatarUrl}
          className={cn("size-[26px] border-2", edgeClassName, i > 0 && "-ml-2")}
          textClassName="text-[10px]"
        />
      ))}
      {rest > 0 && (
        <span className={cn("-ml-2 grid size-[26px] place-items-center rounded-full border-2 bg-neutral-200 text-[10px] font-semibold text-text-3", edgeClassName)}>
          +{rest}
        </span>
      )}
    </div>
  );
}
