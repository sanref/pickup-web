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
