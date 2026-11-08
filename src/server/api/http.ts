import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/api/contract";
import { UserError } from "@/server/errors";
import { PlacesUnavailableError } from "@/server/services/places";

// Infraestructura común de los route handlers de /api/v1 (la API que consume la app mobile).
// Respuestas: { data } si sale bien, { error: { code, message, issues? } } si no. `message` es apto
// para mostrarle al usuario; `code` es estable para que el cliente decida qué hacer.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "unauthorized", "Tenés que iniciar sesión.");
export const notFound = (what = "Lo que buscás") => new ApiError(404, "not_found", `${what} no existe o no tenés acceso.`);

const NO_STORE = { "Cache-Control": "no-store" };

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status, headers: NO_STORE });
}

function errorResponse(status: number, body: ApiErrorBody["error"]): Response {
  return Response.json({ error: body } satisfies ApiErrorBody, { status, headers: NO_STORE });
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) return errorResponse(error.status, { code: error.code, message: error.message });
  if (error instanceof z.ZodError) {
    return errorResponse(400, {
      code: "invalid_input",
      message: error.issues[0]?.message ?? "Revisá los datos.",
      issues: error.issues.map((i) => ({ path: i.path.map(String), message: i.message })),
    });
  }
  // Regla de negocio (votación cerrada, sin lugar, no sos el organizador…): el mensaje ya es para el usuario.
  if (error instanceof UserError) return errorResponse(422, { code: "rejected", message: error.message });
  if (error instanceof PlacesUnavailableError) {
    console.error("[api/v1]", error.message);
    return errorResponse(503, { code: "unavailable", message: "La búsqueda en Google Maps no está disponible todavía." });
  }
  console.error("[api/v1]", error);
  return errorResponse(500, { code: "internal", message: "Algo salió mal. Probá de nuevo." });
}

type Handler<C> = (request: NextRequest, context: C) => Promise<Response>;

// Envuelve un handler: cualquier error termina en una respuesta JSON con el formato común.
export function handle<C>(fn: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

// Cuerpo JSON validado con zod. Un cuerpo vacío se valida como {}.
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const text = await request.text();
  let body: unknown = {};
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError(400, "invalid_input", "El cuerpo no es JSON válido.");
    }
  }
  return schema.parse(body);
}

// Query string validada con zod (los valores llegan como texto: usar z.coerce para números).
export function readQuery<S extends z.ZodType>(request: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(request.nextUrl.searchParams));
}

const uuidSchema = z.string().uuid();

// Un id con formato inválido es lo mismo que uno que no existe.
export function uuidParam(value: string, what?: string): string {
  if (!uuidSchema.safeParse(value).success) throw notFound(what);
  return value;
}
