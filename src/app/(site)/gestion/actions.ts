"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addManagerSchema, bookingSchema, courtSchema, venueDataSchema } from "@/lib/validations/venue-admin";
import { requireActor, type Actor } from "@/server/auth/session";
import { UserError } from "@/server/errors";
import {
  addVenueManager,
  cancelBooking,
  createBooking,
  createCourt,
  deleteCourt,
  removeVenueManager,
  updateBooking,
  updateCourt,
  updateVenueData,
} from "@/server/services/venue-admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

const id = z.string().uuid();

// Cada acción valida la sesión, el input y (en el servicio) el permiso sobre la sede.
async function run(venueId: unknown, label: string, fn: (actor: Actor, venueId: string) => Promise<unknown>): Promise<ActionResult> {
  const parsedVenue = id.safeParse(venueId);
  if (!parsedVenue.success) return { ok: false, error: "No encontramos la sede." };
  const actor = await requireActor(`/gestion/${parsedVenue.data}`);
  try {
    await fn(actor, parsedVenue.data);
  } catch (error) {
    if (error instanceof UserError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Revisá los datos." };
    console.error(`[gestion] ${label}`, error);
    return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }
  revalidatePath(`/gestion/${parsedVenue.data}`, "layout");
  return { ok: true };
}

// — Datos de la sede —

export async function updateVenueDataAction(venueId: string, input: unknown) {
  return run(venueId, "updateVenueData", async (actor, v) => {
    await updateVenueData(actor, v, venueDataSchema.parse(input));
    revalidatePath(`/sedes/${v}`);
  });
}

export async function addVenueManagerAction(venueId: string, input: unknown) {
  return run(venueId, "addVenueManager", (actor, v) => addVenueManager(actor, v, addManagerSchema.parse(input).email));
}

export async function removeVenueManagerAction(venueId: string, userId: unknown) {
  return run(venueId, "removeVenueManager", (actor, v) => removeVenueManager(actor, v, id.parse(userId)));
}

// — Canchas —

export async function createCourtAction(venueId: string, input: unknown) {
  return run(venueId, "createCourt", (actor, v) => createCourt(actor, v, courtSchema.parse(input)));
}

export async function updateCourtAction(venueId: string, courtId: unknown, input: unknown) {
  return run(venueId, "updateCourt", (actor, v) => updateCourt(actor, v, id.parse(courtId), courtSchema.parse(input)));
}

export async function deleteCourtAction(venueId: string, courtId: unknown) {
  return run(venueId, "deleteCourt", (actor, v) => deleteCourt(actor, v, id.parse(courtId)));
}

// — Turnos —

export async function createBookingAction(venueId: string, input: unknown) {
  return run(venueId, "createBooking", (actor, v) => createBooking(actor, v, bookingSchema.parse(input)));
}

export async function updateBookingAction(venueId: string, bookingId: unknown, input: unknown) {
  return run(venueId, "updateBooking", (actor, v) => updateBooking(actor, v, id.parse(bookingId), bookingSchema.parse(input)));
}

export async function cancelBookingAction(venueId: string, bookingId: unknown) {
  return run(venueId, "cancelBooking", (actor, v) => cancelBooking(actor, v, id.parse(bookingId)));
}
