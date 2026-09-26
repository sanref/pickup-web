import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/profile/user-avatar";
import type { MatchParticipant } from "@/server/services/matches";

function Person({ p, index, you }: { p: MatchParticipant; index?: number; you: boolean }) {
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      {index != null && <span className="w-5 text-right text-xs tabular text-text-3">{index}º</span>}
      <UserAvatar name={p.displayName} src={p.avatarUrl} className="size-[26px]" textClassName="text-[10px]" />
      <span className="truncate text-sm">
        {p.displayName}
        {you && <span className="text-text-3"> (vos)</span>}
      </span>
      {p.isOrganizer && (
        <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
          org
        </Badge>
      )}
    </li>
  );
}

// Lista del partido confirmado: confirmados, lista de espera por turno y los que votaron otro horario.
export function MatchRoster({ participants, capacity, viewerId }: { participants: MatchParticipant[]; capacity: number; viewerId: string | null }) {
  const confirmed = participants.filter((p) => p.status === "confirmed");
  const waitlist = participants.filter((p) => p.status === "waitlist");
  const interested = participants.filter((p) => p.status === "interested");

  return (
    <div className="grid gap-5 rounded-lg bg-surface p-5 shadow-sm sm:grid-cols-2">
      <section className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-text-3">
          Confirmados · {confirmed.length} de {capacity}
        </span>
        <ul className="m-0 list-none p-0">
          {confirmed.map((p) => (
            <Person key={p.userId} p={p} you={p.userId === viewerId} />
          ))}
        </ul>
      </section>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-text-3">Lista de espera · {waitlist.length}</span>
          {waitlist.length ? (
            <ul className="m-0 list-none p-0">
              {waitlist.map((p, i) => (
                <Person key={p.userId} p={p} index={i + 1} you={p.userId === viewerId} />
              ))}
            </ul>
          ) : (
            <span className="text-sm text-text-3">Nadie esperando.</span>
          )}
        </section>
        {interested.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-text-3">Votaron otro horario · {interested.length}</span>
            <ul className="m-0 list-none p-0">
              {interested.map((p) => (
                <Person key={p.userId} p={p} you={p.userId === viewerId} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
