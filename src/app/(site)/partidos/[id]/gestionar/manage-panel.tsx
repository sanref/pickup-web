"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CapacityBar } from "@/components/match/match-bits";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { formatSlotDay, formatTime, formatWeekday } from "@/lib/dates";
import type { MatchActionResult } from "@/server/match-action";
import type { ManageSlot, MatchParticipant, ParticipantStatus } from "@/server/services/matches";
import { cancelMatchAction, confirmSlotAction, removeParticipantAction, setAutoConfirmAction } from "./actions";

type Props = {
  matchId: string;
  status: string;
  capacity: number;
  timezone: string;
  autoConfirm: boolean;
  slots: ManageSlot[];
  participants: MatchParticipant[];
  organizerId: string;
};

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  confirmed: "Confirmado",
  waitlist: "En espera",
  interested: "Interesado",
  left: "Se bajó",
};

function names(list: { displayName: string }[]) {
  return list.length ? list.map((p) => p.displayName).join(", ") : "nadie";
}

export function ManagePanel({ matchId, status, capacity, timezone, autoConfirm, slots, participants, organizerId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<ManageSlot | null>(null);
  const [removing, setRemoving] = useState<MatchParticipant | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const open = status === "open";
  const editable = open || status === "confirmed";

  function run(action: () => Promise<MatchActionResult>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      after?.();
      router.refresh();
    });
  }

  const preview = confirming && {
    confirmed: confirming.voters.slice(0, capacity),
    waitlist: confirming.voters.slice(capacity),
    others: participants.filter((p) => !confirming.voters.some((v) => v.userId === p.userId)),
  };

  return (
    <div className="flex flex-col gap-8">
      {open && (
        <section className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[21px] tracking-[-0.02em]">Confirmar horario</h2>
            <p className="m-0 text-sm text-text-2">
              Podés confirmar aunque ninguna opción haya llegado al cupo. Los que votaron entran por orden de voto.
            </p>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {slots.map((slot) => {
              const votes = slot.voters.length;
              return (
                <li key={slot.id} className="flex flex-col gap-3 rounded-md border border-edge bg-surface p-4 shadow-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-text-3">{formatSlotDay(slot.startsAt, timezone)}</span>
                      <span className="font-display text-[22px] leading-tight tabular">{formatTime(slot.startsAt, timezone)}</span>
                    </div>
                    <span className="text-sm text-text-2">
                      {votes} de {capacity}
                    </span>
                  </div>
                  <CapacityBar value={votes} capacity={capacity} />
                  <Button variant={votes >= capacity ? "primary" : "outline"} disabled={pending} onClick={() => setConfirming(slot)}>
                    Confirmar este horario
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2 rounded-md border border-edge bg-surface p-4 shadow-sm">
            <span className="text-sm font-semibold">Cuando una opción llegue al cupo</span>
            <Segmented
              name="auto-confirm"
              label="Confirmación automática"
              value={autoConfirm ? "auto" : "manual"}
              options={[
                { value: "manual", label: "Me avisan y confirmo yo" },
                { value: "auto", label: "Se confirma sola" },
              ]}
              onChange={(v) =>
                run(
                  () => setAutoConfirmAction({ matchId, value: v === "auto" }),
                  v === "auto" ? "Se va a confirmar sola al llegar al cupo." : "Vas a confirmar vos.",
                )
              }
            />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3.5">
        <h2 className="m-0 text-[21px] tracking-[-0.02em]">Anotados · {participants.length}</h2>
        <ul className="m-0 flex list-none flex-col divide-y divide-neutral-200 rounded-md border border-edge bg-surface p-0 px-4 shadow-sm">
          {participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 py-3">
              <UserAvatar name={p.displayName} src={p.avatarUrl} className="size-[30px]" textClassName="text-[11px]" />
              <span className="min-w-0 flex-1 truncate text-sm">{p.displayName}</span>
              <Badge variant={p.status === "confirmed" ? "navy" : "neutral"}>{STATUS_LABEL[p.status]}</Badge>
              {editable && p.userId !== organizerId && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => setRemoving(p)}>
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {editable && (
        <section className="flex flex-col items-start gap-2 border-t border-border pt-6">
          <h2 className="m-0 text-lg font-semibold tracking-[-0.02em]">Cancelar el partido</h2>
          <p className="m-0 text-sm text-text-2">Les avisamos a todos los anotados. No se puede deshacer.</p>
          <Button variant="outline" className="border-coral text-coral-700" disabled={pending} onClick={() => setCancelling(true)}>
            Cancelar partido
          </Button>
        </section>
      )}

      <Dialog open={!!confirming} onOpenChange={(v) => !v && setConfirming(null)}>
        <DialogContent>
          {confirming && preview && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Confirmar el {formatWeekday(confirming.startsAt, timezone)} {formatSlotDay(confirming.startsAt, timezone).split(" ")[1]} a las{" "}
                  {formatTime(confirming.startsAt, timezone)}
                </DialogTitle>
                <DialogDescription>Así queda el partido. Les avisamos a todos.</DialogDescription>
              </DialogHeader>
              <dl className="m-0 flex flex-col gap-3 text-sm">
                <div>
                  <dt className="font-semibold">Confirmados ({preview.confirmed.length} de {capacity})</dt>
                  <dd className="m-0 text-text-2">{names(preview.confirmed)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">En lista de espera ({preview.waitlist.length})</dt>
                  <dd className="m-0 text-text-2">{names(preview.waitlist)}</dd>
                </div>
                {preview.others.length > 0 && (
                  <div>
                    <dt className="font-semibold">No votaron este horario ({preview.others.length})</dt>
                    <dd className="m-0 text-text-2">{names(preview.others)}. Les avisamos para que se sumen si queda lugar.</dd>
                  </div>
                )}
              </dl>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  Volver
                </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(() => confirmSlotAction({ matchId, slotId: confirming.id }), "Partido confirmado.", () =>
                      router.push(`/partidos/${matchId}`),
                    )
                  }
                >
                  {pending ? "Confirmando…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <DialogContent>
          {removing && (
            <>
              <DialogHeader>
                <DialogTitle>¿Quitar a {removing.displayName}?</DialogTitle>
                <DialogDescription>
                  Le avisamos que ya no está en el partido.
                  {removing.status === "confirmed" && " Su lugar lo toma el primero de la lista de espera."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setRemoving(null)} disabled={pending}>
                  Volver
                </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(() => removeParticipantAction({ matchId, userId: removing.userId }), `Quitaste a ${removing.displayName}.`, () =>
                      setRemoving(null),
                    )
                  }
                >
                  Quitar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelling} onOpenChange={setCancelling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar el partido?</DialogTitle>
            <DialogDescription>Les avisamos a los {participants.length - 1} anotados. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(false)} disabled={pending}>
              Volver
            </Button>
            <Button
              disabled={pending}
              onClick={() => run(() => cancelMatchAction({ matchId }), "Cancelaste el partido.", () => router.push(`/partidos/${matchId}`))}
            >
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
