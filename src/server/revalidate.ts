import "server-only";
import { revalidatePath } from "next/cache";

// Vistas de la web que muestran un partido. Se revalidan después de cualquier cambio, venga de una
// Server Action de la web o de la API v1 (mobile).
export function revalidateMatchViews(matchId: string) {
  revalidatePath(`/partidos/${matchId}`);
  revalidatePath("/mis-partidos");
}
