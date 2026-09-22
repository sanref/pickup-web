import { z } from "zod";
import { SKILL_LEVELS } from "./profile";

export const MAX_SLOTS = 4;
export const DURATIONS = [60, 90, 120] as const;

export const slotInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Elegí la hora."),
  durationMinutes: z.union(DURATIONS.map((d) => z.literal(d)) as [z.ZodLiteral<60>, z.ZodLiteral<90>, z.ZodLiteral<120>]),
});
export type SlotInput = z.infer<typeof slotInputSchema>;

export const createMatchSchema = z.object({
  sportId: z.number().int().positive(),
  venueId: z.string().uuid("Elegí la sede."),
  title: z.string().trim().min(3, "El título es muy corto.").max(80, "Máximo 80 caracteres."),
  description: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional().default(""),
  capacity: z.number().int().min(2, "El cupo mínimo es 2.").max(30, "El cupo máximo es 30."),
  level: z.enum(SKILL_LEVELS).nullable(),
  pricePerPerson: z.number().min(0).max(1_000_000).nullable(),
  visibility: z.enum(["public", "private"]),
  slots: z.array(slotInputSchema).min(1, "Proponé al menos un horario.").max(MAX_SLOTS, `Máximo ${MAX_SLOTS} horarios.`),
});
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const setVotesSchema = z.object({
  matchId: z.string().uuid(),
  slotIds: z.array(z.string().uuid()).max(MAX_SLOTS),
  invite: z.string().max(40).optional(),
});
