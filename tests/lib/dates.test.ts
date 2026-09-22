import { describe, expect, it } from "vitest";
import { formatDayOfMonth, formatShortWeekday, formatSlotDay, formatTime, formatWeekday, zonedToUtc } from "@/lib/dates";

const TZ = "America/Argentina/Cordoba";

describe("zonedToUtc", () => {
  it("convierte la hora local de la sede a UTC (Argentina es UTC-3 todo el año)", () => {
    expect(zonedToUtc("2026-09-24", "20:00", TZ).toISOString()).toBe("2026-09-24T23:00:00.000Z");
  });

  it("cruza al día siguiente en UTC cuando corresponde", () => {
    expect(zonedToUtc("2026-12-31", "22:30", TZ).toISOString()).toBe("2027-01-01T01:30:00.000Z");
  });
});

describe("formato en la zona de la sede", () => {
  const instant = new Date("2026-09-24T23:00:00.000Z");

  it("muestra día y hora locales, no los del servidor", () => {
    expect(formatSlotDay(instant, TZ)).toBe("Jue 24/9");
    expect(formatTime(instant, TZ)).toBe("20:00");
    expect(formatWeekday(instant, TZ)).toBe("jueves");
    expect(formatShortWeekday(instant, TZ)).toBe("Jue");
    expect(formatDayOfMonth(instant, TZ)).toBe("24");
  });

  it("es ida y vuelta con zonedToUtc", () => {
    const utc = zonedToUtc("2026-10-03", "09:15", TZ);
    expect(formatSlotDay(utc, TZ)).toBe("Sáb 3/10");
    expect(formatTime(utc, TZ)).toBe("09:15");
  });
});
