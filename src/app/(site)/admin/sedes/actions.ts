"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/server/auth/session";
import { assertAdmin } from "@/server/authz";
import { mergeVenue, reviewVenue } from "@/server/services/venues";

const id = z.string().uuid();

async function admin() {
  const actor = await requireActor("/admin/sedes");
  assertAdmin(actor);
  return actor;
}

export async function reviewVenueAction(form: FormData) {
  const actor = await admin();
  const parsed = z
    .object({ venueId: id, decision: z.enum(["verified", "rejected"]) })
    .parse({ venueId: form.get("venueId"), decision: form.get("decision") });
  await reviewVenue(actor, parsed.venueId, parsed.decision);
  revalidatePath("/admin/sedes");
}

export async function mergeVenueAction(form: FormData) {
  const actor = await admin();
  const parsed = z.object({ venueId: id, intoId: id }).parse({ venueId: form.get("venueId"), intoId: form.get("intoId") });
  await mergeVenue(actor, parsed.venueId, parsed.intoId);
  revalidatePath("/admin/sedes");
}
