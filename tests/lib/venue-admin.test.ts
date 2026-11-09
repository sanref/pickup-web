import { describe, expect, it } from "vitest";
import { addDaysToKey, isDateKey, minutesToTime, timeToMinutes, weekStartKey, zonedDateKey, zonedMinutes } from "@/lib/dates";
import { compactDurationOptions, durationOptions, formatDuration, isValidDuration } from "@/lib/validations/venue-admin";

const TZ = "America/Argentina/Cordoba";

describe("duraciones de turnos", () => {
  it("son múltiplos del turno mínimo hasta 4 horas", () => {
    expect(durationOptions(60)).toEqual([60, 120, 180, 240]);
    expect(durationOptions(90)).toEqual([90, 180]);
  });

  it("para el control segmentado ofrece hasta 4, desde 1 h y de a media hora", () => {
    expect(compactDurationOptions(60)).toEqual([60, 120, 180, 240]);
    expect(compactDurationOptions(30)).toEqual([60, 90, 120, 150]);
    expect(compactDurationOptions(45)).toEqual([90, 180]);
    expect(compactDurationOptions(120)).toEqual([120, 240]);
  });

  it("valida que la duración respete el turno mínimo", () => {
    expect(isValidDuration(120, 60)).toBe(true);
    expect(isValidDuration(90, 60)).toBe(false);
    expect(isValidDuration(30, 60)).toBe(false);
    expect(isValidDuration(300, 60)).toBe(false);
  });

  it("se muestran en horas y minutos", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDuration(135)).toBe("2 h 15");
  });
});

describe("fechas del calendario", () => {
  it("toma el día y los minutos en la zona de la sede", () => {
    const instant = new Date("2026-11-09T02:30:00.000Z"); // 23:30 del 8/11 en Argentina
    expect(zonedDateKey(instant, TZ)).toBe("2026-11-08");
    expect(zonedMinutes(instant, TZ)).toBe(23 * 60 + 30);
    expect(zonedMinutes(new Date("2026-11-09T03:00:00.000Z"), TZ)).toBe(0);
  });

  it("suma días y encuentra el lunes de la semana", () => {
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(weekStartKey("2026-11-08")).toBe("2026-11-02"); // domingo → lunes anterior
    expect(weekStartKey("2026-11-09")).toBe("2026-11-09"); // lunes
  });

  it("valida fechas YYYY-MM-DD reales", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-2-3")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });

  it("convierte entre minutos y HH:mm", () => {
    expect(minutesToTime(570)).toBe("09:30");
    expect(timeToMinutes("21:45")).toBe(21 * 60 + 45);
  });
});
