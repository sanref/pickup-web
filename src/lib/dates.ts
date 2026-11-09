import { TZDate } from "@date-fns/tz";

// Todo se guarda en UTC y se muestra en la zona horaria de la sede.

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", { timeZone, ...options }).formatToParts(date);
}

function part(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes) {
  return parts(date, timeZone, options).find((p) => p.type === type)?.value ?? "";
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Jue" */
export function formatShortWeekday(date: Date, timeZone: string): string {
  return capitalize(part(date, timeZone, { weekday: "short" }, "weekday").replace(".", ""));
}

/** "24" */
export function formatDayOfMonth(date: Date, timeZone: string): string {
  return part(date, timeZone, { day: "numeric" }, "day");
}

/** "Jue 24/9" */
export function formatSlotDay(date: Date, timeZone: string): string {
  const month = part(date, timeZone, { month: "numeric" }, "month");
  return `${formatShortWeekday(date, timeZone)} ${formatDayOfMonth(date, timeZone)}/${month}`;
}

/** "20:00" */
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/** "viernes" */
export function formatWeekday(date: Date, timeZone: string): string {
  return part(date, timeZone, { weekday: "long" }, "weekday");
}

/** Fecha y hora locales de la sede (YYYY-MM-DD, HH:mm) → instante UTC. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, timeZone).getTime());
}

/** "YYYY-MM-DD" de hoy en la zona de la sede, para el mínimo del selector de fecha. */
export function todayIn(timeZone: string): string {
  const p = parts(new Date(), timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// — Calendario de turnos: días como "YYYY-MM-DD" en la zona de la sede —

/** "YYYY-MM-DD" del instante en la zona de la sede. */
export function zonedDateKey(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutos desde la medianoche local de la sede (0–1439). */
export function zonedMinutes(date: Date, timeZone: string): number {
  const p = parts(date, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}

/** Suma días a una fecha "YYYY-MM-DD" (sin zona: es aritmética de calendario). */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Lunes de la semana de esa fecha. */
export function weekStartKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return addDaysToKey(key, -((weekday + 6) % 7));
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "sábado 8 de noviembre" para una fecha "YYYY-MM-DD". */
export function formatDateKey(key: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", ...options }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** 570 → "09:30" */
export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "09:30" → 570 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
