import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ApiErrorBody } from "@/lib/api/contract";
import { searchMatchesQuerySchema, votesBodySchema } from "@/lib/validations/api";
import { ApiError, handle, ok, readJson, readQuery, toErrorResponse, uuidParam } from "@/server/api/http";
import { UserError } from "@/server/errors";

async function errorOf(res: Response) {
  return ((await res.json()) as ApiErrorBody).error;
}

describe("respuestas de la API", () => {
  it("ok envuelve en { data } y no se cachea", async () => {
    const res = ok({ id: "x", at: new Date("2026-01-02T03:04:05Z") }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ data: { id: "x", at: "2026-01-02T03:04:05.000Z" } });
  });

  it("UserError → 422 rejected con el mensaje para el usuario", async () => {
    const res = toErrorResponse(new UserError("La votación de este partido ya cerró."));
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toEqual({ code: "rejected", message: "La votación de este partido ya cerró." });
  });

  it("ZodError → 400 invalid_input con issues", async () => {
    const parsed = z.object({ title: z.string().min(3, "El título es muy corto.") }).safeParse({ title: "a" });
    const res = toErrorResponse(parsed.error);
    expect(res.status).toBe(400);
    const error = await errorOf(res);
    expect(error.code).toBe("invalid_input");
    expect(error.message).toBe("El título es muy corto.");
    expect(error.issues).toEqual([{ path: ["title"], message: "El título es muy corto." }]);
  });

  it("ApiError conserva status y code", async () => {
    const res = toErrorResponse(new ApiError(403, "onboarding_required", "Completá tu perfil para seguir."));
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("onboarding_required");
  });

  it("cualquier otro error → 500 genérico, sin filtrar el detalle", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const res = toErrorResponse(new Error("connection refused: postgres://secreto"));
      expect(res.status).toBe(500);
      expect(await errorOf(res)).toEqual({ code: "internal", message: "Algo salió mal. Probá de nuevo." });
    } finally {
      console.error = original;
    }
  });

  it("handle convierte las excepciones en respuestas", async () => {
    const route = handle(async () => {
      throw new UserError("Este partido ya no suma gente.");
    });
    const res = await route(new NextRequest("http://localhost/api/v1/x"), {});
    expect(res.status).toBe(422);
  });
});

describe("lectura del request", () => {
  const post = (body: string) => new NextRequest("http://localhost/api/v1/x", { method: "POST", body });

  it("readJson valida el cuerpo", async () => {
    const id = "7d6a1c2e-4b1f-4a51-9a54-0c7c6d3c9b11";
    expect(await readJson(post(JSON.stringify({ slotIds: [id] })), votesBodySchema)).toEqual({ slotIds: [id] });
  });

  it("readJson trata el cuerpo vacío como {}", async () => {
    expect(await readJson(post(""), z.object({ invite: z.string().optional() }))).toEqual({});
  });

  it("readJson rechaza JSON roto con 400", async () => {
    await expect(readJson(post("{nope"), votesBodySchema)).rejects.toMatchObject({ status: 400, code: "invalid_input" });
  });

  it("uuidParam: un id con formato inválido es 404", () => {
    expect(() => uuidParam("123", "El partido")).toThrow(ApiError);
    expect(uuidParam("7d6a1c2e-4b1f-4a51-9a54-0c7c6d3c9b11")).toBe("7d6a1c2e-4b1f-4a51-9a54-0c7c6d3c9b11");
  });
});

describe("query de búsqueda de partidos", () => {
  const query = (qs: string) => readQuery(new NextRequest(`http://localhost/api/v1/matches?${qs}`), searchMatchesQuerySchema);

  it("aplica los valores por defecto", () => {
    expect(query("")).toEqual({ km: 10, when: "todas", sort: "cerca", limit: 60 });
  });

  it("convierte los números", () => {
    expect(query("lat=-32.95&lng=-60.64&km=5&sportId=2&level=advanced&when=finde&sort=pronto")).toMatchObject({
      lat: -32.95,
      lng: -60.64,
      km: 5,
      sportId: 2,
      level: "advanced",
      when: "finde",
      sort: "pronto",
    });
  });

  it("exige lat y lng juntas", () => {
    expect(() => query("lat=-32.95")).toThrow(z.ZodError);
  });

  it("rechaza un radio fuera de rango", () => {
    expect(() => query("km=500")).toThrow(z.ZodError);
  });
});
