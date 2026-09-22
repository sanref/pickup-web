"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext, withNext } from "@/lib/safe-next";
import { auth } from "@/server/auth/neon";
import { requestOrigin } from "@/server/request-origin";
import { ensureProfile } from "@/server/services/profiles";

export type AuthFormState = { error?: string; notice?: string; email?: string } | undefined;

type AuthError = { code?: string; message?: string; status?: number } | null | undefined;

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "El email o la contraseña no coinciden.",
  INVALID_EMAIL_OR_PASSWORD: "El email o la contraseña no coinciden.",
  INVALID_PASSWORD: "El email o la contraseña no coinciden.",
  USER_ALREADY_EXISTS:
    "Ya hay una cuenta con ese email. Iniciá sesión; si la creaste con Google, entrá con “Continuar con Google”.",
  PASSWORD_TOO_SHORT: "La contraseña tiene que tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  INVALID_EMAIL: "Revisá el email.",
  EMAIL_NOT_VERIFIED: "Tenés que verificar tu email antes de entrar.",
  INVALID_OTP: "El código no es correcto.",
  OTP_EXPIRED: "El código venció. Pedí uno nuevo.",
  TOO_MANY_ATTEMPTS: "Demasiados intentos. Pedí un código nuevo.",
};

// Los códigos no son estables: el proxy devuelve los de Better Auth (USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL),
// las llamadas de servidor del SDK los reemplazan por genéricos (validation_failed, invalid_credentials).
// Por eso se reconoce primero el código y, si no alcanza, el mensaje en inglés de Better Auth.
const BY_MESSAGE: [RegExp, string][] = [
  [/already exists/i, "USER_ALREADY_EXISTS"],
  [/invalid (email or )?password|invalid credentials/i, "INVALID_CREDENTIALS"],
  [/email not verified/i, "EMAIL_NOT_VERIFIED"],
  [/password (is )?too short/i, "PASSWORD_TOO_SHORT"],
  [/password (is )?too long/i, "PASSWORD_TOO_LONG"],
  [/invalid email/i, "INVALID_EMAIL"],
  [/otp.*expired|code.*expired/i, "OTP_EXPIRED"],
  [/invalid otp|invalid code/i, "INVALID_OTP"],
  [/too many attempts/i, "TOO_MANY_ATTEMPTS"],
];

function codeOf(error: AuthError): string {
  const code = (error?.code ?? "").toUpperCase().replace(/_USE_ANOTHER_EMAIL$/, "");
  if (MESSAGES[code]) return code;
  const message = error?.message ?? "";
  return BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1] ?? code;
}

function describe(error: AuthError): string {
  if (error?.status === 429) return "Demasiados intentos. Esperá un minuto y probá de nuevo.";
  const known = MESSAGES[codeOf(error)];
  if (known) return known;
  console.error("[auth] error no mapeado", error);
  return "No pudimos completar la operación. Probá de nuevo.";
}

const email = z.string().trim().toLowerCase().email("Revisá el email.");
const password = z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres.").max(128);
const otp = z.string().trim().regex(/^\d{6}$/, "El código tiene 6 números.");

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos.";
}

export async function signInWithEmail(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const next = safeNext(form.get("next"));
  const parsed = z.object({ email, password: z.string().min(1, "Poné tu contraseña.") }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error), email: String(form.get("email") ?? "") };

  const { data, error } = await auth.signIn.email(parsed.data);
  if (error) {
    if (codeOf(error) === "EMAIL_NOT_VERIFIED") {
      await auth.emailOtp.sendVerificationOtp({ email: parsed.data.email, type: "email-verification" });
      redirect(withNext(`/verificar-email?email=${encodeURIComponent(parsed.data.email)}`, next));
    }
    return { error: describe(error), email: parsed.data.email };
  }
  // La sesión recién creada todavía no se puede leer en este request: el perfil se busca por el id.
  const profile = data?.user ? await ensureProfile(data.user) : null;
  redirect(profile && !profile.onboardedAt ? withNext("/onboarding", next) : next);
}

export async function signUpWithEmail(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const next = safeNext(form.get("next"));
  const parsed = z
    .object({ name: z.string().trim().min(1, "Poné tu nombre.").max(60, "Máximo 60 caracteres."), email, password })
    .safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: firstIssue(parsed.error), email: String(form.get("email") ?? "") };

  const { data, error } = await auth.signUp.email(parsed.data);
  if (error) return { error: describe(error), email: parsed.data.email };

  // Sin token = Neon Auth exige verificar el email antes de iniciar sesión.
  if (!data?.token) {
    redirect(withNext(`/verificar-email?email=${encodeURIComponent(parsed.data.email)}`, next));
  }
  redirect(withNext("/onboarding", next));
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNext(form.get("next"));
  const callbackURL = `${await requestOrigin()}${withNext("/auth/callback", next)}`;
  const { data, error } = await auth.signIn.social({ provider: "google", callbackURL });
  if (error || !data?.url) redirect(withNext("/login?error=google", next));
  redirect(data.url);
}

export async function verifyEmailCode(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const next = safeNext(form.get("next"));
  const parsed = z.object({ email, otp }).safeParse({ email: form.get("email"), otp: form.get("otp") });
  if (!parsed.success) return { error: firstIssue(parsed.error), email: String(form.get("email") ?? "") };

  const { data, error } = await auth.emailOtp.verifyEmail(parsed.data);
  if (error) return { error: describe(error), email: parsed.data.email };

  if (data && "token" in data && data.token) redirect(withNext("/onboarding", next));
  redirect(withNext(`/login?verificado=1`, next));
}

export async function resendVerificationCode(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { error } = await auth.emailOtp.sendVerificationOtp({ email: parsed.data, type: "email-verification" });
  if (error) return { error: describe(error), email: parsed.data };
  return { notice: "Te mandamos un código nuevo.", email: parsed.data };
}

export async function requestPasswordReset(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const next = safeNext(form.get("next"));
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: firstIssue(parsed.error), email: String(form.get("email") ?? "") };

  const { error } = await auth.emailOtp.sendVerificationOtp({ email: parsed.data, type: "forget-password" });
  // No revelamos si el email tiene cuenta: solo cortamos ante límites de uso.
  if (error?.status === 429) return { error: describe(error), email: parsed.data };
  redirect(withNext(`/nueva-contrasena?email=${encodeURIComponent(parsed.data)}`, next));
}

export async function resetPassword(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const next = safeNext(form.get("next"));
  const parsed = z
    .object({ email, otp, password })
    .safeParse({ email: form.get("email"), otp: form.get("otp"), password: form.get("password") });
  if (!parsed.success) return { error: firstIssue(parsed.error), email: String(form.get("email") ?? "") };

  const { error } = await auth.emailOtp.resetPassword(parsed.data);
  if (error) return { error: describe(error), email: parsed.data.email };
  redirect(withNext("/login?contrasena=1", next));
}

export async function signOut() {
  await auth.signOut();
  redirect("/");
}
