import { z } from "zod";

// Gestión de sedes (admins de sede): canchas, turnos y datos de la sede.

/** Turnos mínimos que se ofrecen al crear una cancha. */
export const SLOT_MINUTES_OPTIONS = [30, 45, 60, 90, 120] as const;
/** Un turno (o un horario de partido) dura como mucho esto. */
export const MAX_BOOKING_MINUTES = 240;

const uuid = z.string().uuid();
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha.");
const timeKey = z.string().regex(/^\d{2}:\d{2}$/, "Elegí la hora.");
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().default("");

export const courtSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(60, "Máximo 60 caracteres."),
  sportId: z.number().int().positive("Elegí la actividad."),
  slotMinutes: z
    .number()
    .int()
    .min(15, "El turno mínimo es de 15 minutos.")
    .max(MAX_BOOKING_MINUTES, "El turno mínimo no puede pasar las 4 horas.")
    .refine((n) => n % 15 === 0, "El turno tiene que ser múltiplo de 15 minutos."),
  isActive: z.boolean().optional().default(true),
});
export type CourtInput = z.infer<typeof courtSchema>;

export const bookingSchema = z.object({
  courtId: uuid,
  date: dateKey,
  time: timeKey,
  durationMinutes: z.number().int().min(15).max(MAX_BOOKING_MINUTES, "Un turno dura como mucho 4 horas."),
  customerName: optionalText(80, "Máximo 80 caracteres."),
  customerPhone: optionalText(40, "Máximo 40 caracteres."),
  notes: optionalText(500, "Máximo 500 caracteres."),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const venueDataSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto.").max(120, "Máximo 120 caracteres."),
  phone: optionalText(40, "Máximo 40 caracteres."),
  sportIds: z.array(z.number().int().positive()).min(1, "Elegí al menos un deporte.").max(20),
});
export type VenueDataInput = z.infer<typeof venueDataSchema>;

export const addManagerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Revisá el email."),
});

/** Duraciones posibles para una cancha: múltiplos del turno mínimo hasta 4 horas. */
export function durationOptions(slotMinutes: number, max = MAX_BOOKING_MINUTES): number[] {
  const out: number[] = [];
  for (let d = slotMinutes; d <= max; d += slotMinutes) out.push(d);
  return out;
}

/** Hasta 4 duraciones para un control segmentado: con turnos cortos se ofrecen las de media hora desde 1 h. */
export function compactDurationOptions(slotMinutes: number): number[] {
  const all = durationOptions(slotMinutes);
  if (all.length <= 4) return all;
  return all.filter((d) => d >= 60 && d % 30 === 0).slice(0, 4);
}

export function isValidDuration(durationMinutes: number, slotMinutes: number): boolean {
  return durationMinutes >= slotMinutes && durationMinutes % slotMinutes === 0 && durationMinutes <= MAX_BOOKING_MINUTES;
}

/** "45 min", "1 h", "1 h 30" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
