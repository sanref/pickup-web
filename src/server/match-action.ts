import "server-only";
import { revalidatePath } from "next/cache";
import { UserError } from "@/server/errors";

export type MatchActionResult<T = null> = { ok: true; value: T } | { ok: false; error: string };

// Envoltorio común de las Server Actions de partidos: traduce UserError a mensaje y revalida las vistas.
export async function runMatchAction<T>(matchId: string, fn: () => Promise<T>): Promise<MatchActionResult<T>> {
  let value: T;
  try {
    value = await fn();
  } catch (error) {
    if (error instanceof UserError) return { ok: false, error: error.message };
    console.error("[partidos]", error);
    return { ok: false, error: "No pudimos guardar el cambio. Probá de nuevo." };
  }
  revalidatePath(`/partidos/${matchId}`);
  revalidatePath("/mis-partidos");
  return { ok: true, value };
}
