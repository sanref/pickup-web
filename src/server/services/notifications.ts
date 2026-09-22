import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";

const { notifications } = schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NotificationType =
  | "participant_joined" // alguien se sumó a tu partido (al organizador)
  | "slot_full" // una opción llegó al cupo (al organizador, si no hay confirmación automática)
  | "match_confirmed" // quedaste confirmado
  | "match_waitlisted" // se confirmó y quedaste en lista de espera
  | "match_confirmed_other_slot" // se confirmó un horario que no votaste: sumate si queda lugar
  | "waitlist_promoted" // pasaste de la lista de espera a confirmado
  | "removed_from_match" // el organizador te sacó del partido
  | "match_cancelled";

export type NewNotification = { userId: string; type: NotificationType; matchId: string; payload?: Record<string, unknown> };

// Se insertan dentro de la transacción de la acción que las origina (plan, sección 4).
// El envío por email y el contador in-app llegan en la fase de notificaciones.
export async function notify(tx: Tx, rows: NewNotification[]) {
  if (rows.length === 0) return;
  await tx.insert(notifications).values(rows.map((r) => ({ ...r, payload: r.payload ?? {} })));
}

export async function alreadyNotified(tx: Tx, matchId: string, type: NotificationType, key: string, value: string) {
  const [row] = await tx
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.matchId, matchId), eq(notifications.type, type), sql`${notifications.payload} ->> ${key} = ${value}`))
    .limit(1);
  return !!row;
}
