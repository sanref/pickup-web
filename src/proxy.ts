import type { NextRequest } from "next/server";
import { withNext } from "@/lib/safe-next";
import { auth } from "@/server/auth/neon";

const neonAuth = auth.middleware({ loginUrl: "/login" });

// Redirección optimista para las rutas privadas y canje del token de Google en /auth/callback.
// La validación real se hace en cada página y cada acción (requireActor).
export async function proxy(request: NextRequest) {
  const response = await neonAuth(request);
  const location = response.headers.get("location");
  if (location && new URL(location).pathname === "/login") {
    // El SDK no conserva la ruta de origen: la agregamos como ?next= para volver después del login.
    const { pathname, search } = request.nextUrl;
    const target = new URL(withNext("/login", `${pathname}${search}`), request.url);
    response.headers.set("location", target.toString());
  }
  return response;
}

export const config = {
  matcher: [
    "/auth/callback",
    "/onboarding",
    "/perfil",
    "/mis-partidos/:path*",
    "/partidos/nuevo",
    "/partidos/:id/gestionar",
    "/equipos/:path*",
    "/sedes/nueva",
    "/admin/:path*",
  ],
};
