import "server-only";
import { requestOrigin } from "@/server/request-origin";

// Cambio de contraseña con el código (OTP) de "Me olvidé la contraseña".
// El SDK (@neondatabase/auth 0.5.0-beta) manda `auth.emailOtp.resetPassword` a "email-otp/passcode",
// que en Neon Auth da 404; el endpoint de Better Auth es "email-otp/reset-password".
// Devuelve el error con la misma forma que el SDK para reutilizar los mensajes.
export async function resetPasswordWithOtp(input: { email: string; otp: string; password: string }): Promise<{
  error: { code?: string; message?: string; status: number } | null;
}> {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) throw new Error("Falta NEON_AUTH_BASE_URL en .env.local");
  const response = await fetch(`${base.replace(/\/+$/, "")}/email-otp/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: await requestOrigin() },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (response.ok) return { error: null };
  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  return { error: { code: body.code, message: body.message, status: response.status } };
}
