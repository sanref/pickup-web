import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSlotDay, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireOnboardedActor } from "@/server/auth/session";
import { listMyMatches, type MyMatch } from "@/server/services/matches";

export const metadata: Metadata = { title: "Mis partidos" };

type Tab = "proximos" | "votacion" | "historial";
type Tone = "confirmed" | "waitlist" | "other-slot" | "pending" | "organizer" | "voted" | "past";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function dateBlock(m: MyMatch): { top: string; main: string } {
  const at = m.confirmedStartsAt;
  if (at) return { top: formatSlotDay(at, m.timezone), main: formatTime(at, m.timezone) };
  const [first] = m.slots;
  if (!first) return { top: "Sin horarios", main: "—" };
  if (m.slots.length === 1) return { top: formatSlotDay(first.startsAt, m.timezone), main: formatTime(first.startsAt, m.timezone) };
  const days = [...new Set(m.slots.map((s) => formatSlotDay(s.startsAt, m.timezone).split(" ")[1].split("/")[0]))];
  const main = days.length === 1 ? formatSlotDay(first.startsAt, m.timezone) : days.length === 2 ? `${days[0]} y ${days[1]}` : `${days[0]} al ${days[days.length - 1]}`;
  return { top: `${m.slots.length} opciones`, main };
}

function summary(m: MyMatch, tone: Tone): string {
  const price = m.pricePerPerson ? ` · ${money.format(m.pricePerPerson)} p/p` : "";
  if (tone === "confirmed" || tone === "past") return `${m.venueName} · ${m.confirmed} de ${m.capacity}${price}`;
  if (tone === "waitlist") return `${m.venueName} · ${m.confirmed} de ${m.capacity} · te avisamos si se baja alguien`;
  if (tone === "other-slot")
    return `${m.venueName} · ${m.confirmed < m.capacity ? `quedan ${m.capacity - m.confirmed} lugares` : "cupo completo, podés anotarte en espera"}`;
  const best = m.slots.reduce((a, s) => (s.votes > a ? s.votes : a), 0);
  const reached = m.slots.find((s) => s.votes >= m.capacity);
  const people = `${m.participants} de ${m.capacity} anotados`;
  if (reached) return `${m.venueName} · ${people} · la opción del ${formatSlotDay(reached.startsAt, m.timezone)} llegó al cupo`;
  if (tone === "organizer") return `${m.venueName} · ${people} · ${best ? `la más votada tiene ${best}` : "ninguna opción tiene votos todavía"}`;
  return `${m.venueName} · ${people} · organiza ${m.organizerName}`;
}

function tag(m: MyMatch, tone: Tone) {
  switch (tone) {
    case "confirmed":
      return <Badge variant="navy">{m.isOrganizer ? "Confirmado · organizás vos" : "Confirmado"}</Badge>;
    case "waitlist":
      return <Badge variant="neutral">Sos suplente · {m.waitlistPosition ?? "?"}º en espera</Badge>;
    case "other-slot":
      return <Badge variant="coral">Se confirmó otro horario</Badge>;
    case "pending":
      return <Badge variant="coral">Te falta votar</Badge>;
    case "organizer":
      return <Badge variant="outline">Organizás vos</Badge>;
    case "voted":
      return <Badge variant="navy">{m.myVotes === 1 ? "Votaste 1 horario" : `Votaste ${m.myVotes} horarios`}</Badge>;
    case "past":
      return <Badge variant={m.status === "cancelled" ? "outline" : "neutral"}>{m.status === "cancelled" ? "Cancelado" : "Jugado"}</Badge>;
  }
}

function MatchRow({ m, tone }: { m: MyMatch; tone: Tone }) {
  const { top, main } = dateBlock(m);
  const needsYou = tone === "pending" || tone === "other-slot";
  const primaryLabel =
    tone === "pending" ? "Votar horarios" : tone === "other-slot" ? "Sumarme" : tone === "organizer" ? "Gestionar" : "Ver partido";
  const href = tone === "organizer" ? `/partidos/${m.id}/gestionar` : `/partidos/${m.id}`;
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-md border border-edge bg-surface p-5 shadow-sm sm:flex-row sm:items-center",
        tone === "confirmed" && "border-l-[6px] border-l-navy",
        needsYou && "border-l-[6px] border-l-coral",
        tone === "past" && "opacity-80",
      )}
    >
      {/* 120px: la columna también aloja rangos ("24 al 26") y todas las filas comparten ancho para alinear los títulos. */}
      <div className="flex w-[120px] shrink-0 flex-col">
        <span className="text-xs font-semibold text-text-3">{top}</span>
        <span className="font-display text-[25px] leading-[1.1] whitespace-nowrap tabular">{main}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/partidos/${m.id}`} className="text-lg font-semibold tracking-[-0.02em] text-text no-underline">
            {m.title}
          </Link>
          {tag(m, tone)}
        </div>
        <span className="text-[13px] text-text-3">{summary(m, tone)}</span>
      </div>
      <div className="flex shrink-0 gap-2">
        {tone === "organizer" && (
          <Button asChild variant="ghost">
            <Link href={`/partidos/${m.id}`}>Ver</Link>
          </Button>
        )}
        <Button asChild variant={needsYou ? "primary" : "outline"}>
          <Link href={href}>{primaryLabel}</Link>
        </Button>
      </div>
    </li>
  );
}

function Group({ label, items, tone }: { label: string; items: MyMatch[]; tone: Tone }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <span className="text-[13px] font-semibold text-text-3">{label}</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((m) => (
          <MatchRow key={m.id} m={m} tone={tone} />
        ))}
      </ul>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-edge bg-surface p-8 shadow-sm">
      <span className="text-2xl font-bold tracking-[-0.02em]">{title}</span>
      <span className="text-sm text-text-2">{text}</span>
      <div className="flex flex-wrap gap-2.5">
        <Button asChild>
          <Link href="/partidos/nuevo">Crear partido</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explorar">Buscar partidos</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function MyMatchesPage({ searchParams }: PageProps<"/mis-partidos">) {
  const actor = await requireOnboardedActor("/mis-partidos");
  const all = await listMyMatches(actor);
  const byDate = (a: MyMatch, b: MyMatch) =>
    (a.confirmedStartsAt ?? a.slots[0]?.startsAt ?? new Date(0)).getTime() - (b.confirmedStartsAt ?? b.slots[0]?.startsAt ?? new Date(0)).getTime();

  const isPast = (m: MyMatch) => m.isPast;
  const upcoming = all.filter((m) => m.status === "confirmed" && !isPast(m)).sort(byDate);
  const voting = all.filter((m) => m.status === "open").sort(byDate);
  const history = all.filter(isPast).sort((a, b) => byDate(b, a));

  const requested = (await searchParams).tab;
  const tab: Tab =
    requested === "proximos" || requested === "votacion" || requested === "historial"
      ? requested
      : upcoming.length
        ? "proximos"
        : "votacion";

  const tabs: { id: Tab; label: string }[] = [
    { id: "proximos", label: `Próximos · ${upcoming.length}` },
    { id: "votacion", label: `En votación · ${voting.length}` },
    { id: "historial", label: "Historial" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pt-7 pb-11 min-[900px]:px-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="m-0 text-[34px] leading-tight tracking-[-0.03em]">Mis partidos</h1>
        <nav aria-label="Filtrar partidos" className="inline-flex overflow-hidden rounded-full border border-edge bg-surface shadow-xs sm:ml-auto">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/mis-partidos?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center px-3.5 text-[13px] no-underline transition-colors duration-150 sm:min-h-0 sm:py-[7px] [&+&]:border-l [&+&]:border-border",
                t.id === tab ? "bg-navy font-semibold text-surface" : "text-text-2 hover:bg-navy/6",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "proximos" &&
        (upcoming.length ? (
          <>
            <Group label="Confirmados" items={upcoming.filter((m) => m.myStatus === "confirmed" || m.isOrganizer)} tone="confirmed" />
            <Group label="En lista de espera" items={upcoming.filter((m) => m.myStatus === "waitlist")} tone="waitlist" />
            <Group
              label="Se confirmó otro horario"
              items={upcoming.filter((m) => m.myStatus === "interested" && !m.isOrganizer)}
              tone="other-slot"
            />
          </>
        ) : (
          <Empty title="No tenés partidos confirmados" text="Cuando el organizador confirme un horario, lo vas a ver acá." />
        ))}

      {tab === "votacion" &&
        (voting.length ? (
          <>
            <Group label="Esperando tu voto" items={voting.filter((m) => !m.isOrganizer && m.myVotes === 0)} tone="pending" />
            <Group label="Organizás vos" items={voting.filter((m) => m.isOrganizer)} tone="organizer" />
            <Group label="Ya votaste" items={voting.filter((m) => !m.isOrganizer && m.myVotes > 0)} tone="voted" />
          </>
        ) : (
          <Empty title="No hay partidos en votación" text="Armá uno con tu gente o buscá una sede y proponé horarios." />
        ))}

      {tab === "historial" &&
        (history.length ? (
          <Group label="Jugados y cancelados" items={history} tone="past" />
        ) : (
          <Empty title="Todavía no jugaste partidos" text="Los partidos que se jueguen o se cancelen van a quedar acá." />
        ))}
    </div>
  );
}
