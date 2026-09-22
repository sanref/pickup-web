import { createNeonAuth, type NeonAuthLogLevel } from "@neondatabase/auth/next/server";

// Sin "server-only": proxy.ts también importa esta instancia.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env.local`);
  return value;
}

export const auth = createNeonAuth({
  baseUrl: required("NEON_AUTH_BASE_URL"),
  cookies: { secret: required("NEON_AUTH_COOKIE_SECRET") },
  // Opcional: NEON_AUTH_LOG_LEVEL=debug para diagnosticar el login (OAuth, cookies).
  logLevel: (process.env.NEON_AUTH_LOG_LEVEL as NeonAuthLogLevel | undefined) ?? "warn",
});
