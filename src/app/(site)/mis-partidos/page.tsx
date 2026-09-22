import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSlotDay, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireOnboardedActor } from "@/server/auth/session";
import { listMyOpenMatches, type MyMatch } from "@/server/services/matches";

export const metadata: Metadata = { title: "Mis partidos" };

function dateBlock(m: MyMatch): { top: string; main: string } {
  const [first] = m.slots;
  if (!first) return { top: "Sin horarios", main: "—" };
  if (m.slots.length === 1) return { top: formatSlotDay(first.startsAt, m.timezone), main: formatTime(first.startsAt, m.timezone) };
  const days = [...new Set(m.slots.map((s) => formatSlotDay(s.startsAt, m.timezone).split(" ")[1].split("/")[0]))];
  const main = days.length === 1 ? formatSlotDay(first.startsAt, m.timezone) : days.length === 2 ? `${days[0]} y ${days[1]}` : `${days[0]} al ${days[days.length - 1]}`;
  return { top: `${m.slots.length} opciones`, main };
}

function summary(m: MyMatch): string {
  const best = m.slots.reduce((a, s) => (s.votes > a ? s.votes : a), 0);
  const reached = m.slots.find((s) => s.votes >= m.capacity);
  const people = `${m.participants} de ${m.capacity} anotados`;
  if (reached) return `${people} · la opción del ${formatSlotDay(reached.startsAt, m.timezone)} llegó al cupo`;
  if (m.isOrganizer) return best ? `${people} · la más votada tiene ${best}` : `${people} · ninguna opción tiene votos todavía`;
  return `${people} · organiza ${m.organizerName}`;
}

function MatchRow({ m, tone }: { m: MyMatch; tone: "pending" | "organizer" | "voted" }) {
  const { top, main } = dateBlock(m);
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-md bg-surface p-5 sm:flex-row sm:items-center",
        tone === "pending" && "border-l-[6px] border-accent shadow-sm",
      )}
    >
      <div className="flex w-24 shrink-0 flex-col">
        <span className="text-[11px] tracking-[0.08em] text-neutral-600 uppercase">{top}</span>
        <span className="font-heading text-[26px] leading-[1.1]">{main}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/partidos/${m.id}`} className="font-heading text-xl text-foreground no-underline">
            {m.title}
          </Link>
          {tone === "pending" && <Badge variant="accent">Te falta votar</Badge>}
          {tone === "organizer" && <Badge variant="outline">Organizás vos</Badge>}
          {tone === "voted" && <Badge variant="accent-2">{m.myVotes === 1 ? "Votaste 1 horario" : `Votaste ${m.myVotes} horarios`}</Badge>}
        </div>
        <span className="text-[13px] text-neutral-700">
          {m.venueName} · {summary(m)}
        </span>
      </div>
      <Button asChild variant={tone === "pending" ? "default" : "secondary"} className="shrink-0">
        <Link href={`/partidos/${m.id}`}>{tone === "pending" ? "Votar horarios" : "Ver partido"}</Link>
      </Button>
    </li>
  );
}

function Group({ label, items, tone }: { label: string; items: MyMatch[]; tone: "pending" | "organizer" | "voted" }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <span className="font-mono text-[11px] tracking-[0.1em] text-neutral-700 uppercase">{label}</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((m) => (
          <MatchRow key={m.id} m={m} tone={tone} />
        ))}
      </ul>
    </section>
  );
}

export default async function MyMatchesPage() {
  const actor = await requireOnboardedActor("/mis-partidos");
  const open = await listMyOpenMatches(actor);
  const pending = open.filter((m) => !m.isOrganizer && m.myVotes === 0);
  const organizing = open.filter((m) => m.isOrganizer);
  const voted = open.filter((m) => !m.isOrganizer && m.myVotes > 0);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pt-7 pb-11 min-[900px]:px-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="m-0 font-heading text-[36px] leading-tight">Mis partidos</h1>
        <Badge variant="accent-2" className="ml-auto">
          En votación · {open.length}
        </Badge>
      </div>

      {open.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-8">
          <span className="font-heading text-2xl">Todavía no estás en ningún partido</span>
          <span className="text-sm text-neutral-800">Armá uno con tu gente o buscá una sede y proponé horarios.</span>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href="/partidos/nuevo">Crear partido</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/sedes">Ver sedes</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Group label="Esperando tu voto" items={pending} tone="pending" />
          <Group label="Organizás vos" items={organizing} tone="organizer" />
          <Group label="Ya votaste" items={voted} tone="voted" />
        </>
      )}
    </div>
  );
}
