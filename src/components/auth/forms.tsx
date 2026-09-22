"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
  verifyEmailCode,
  type AuthFormState,
} from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { withNext } from "@/lib/safe-next";
import { Field, FormMessage } from "./auth-card";
import { SubmitButton } from "./submit-button";

export function LoginForm({ next, defaultEmail }: { next: string; defaultEmail?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signInWithEmail, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="next" value={next} />
      <FormMessage kind="error">{state?.error}</FormMessage>
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email ?? defaultEmail} />
      </Field>
      <Field id="password" label="Contraseña">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex">
        <Link href={withNext("/recuperar", next)} className="ml-auto text-[13px]">
          Olvidé mi contraseña
        </Link>
      </div>
      <SubmitButton className="w-full" pendingLabel="Entrando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signUpWithEmail, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="next" value={next} />
      <FormMessage kind="error">{state?.error}</FormMessage>
      <Field id="name" label="Nombre">
        <Input id="name" name="name" autoComplete="name" required maxLength={60} />
      </Field>
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} />
      </Field>
      <Field id="password" label="Contraseña" hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}

export function VerifyEmailForm({ next, email }: { next: string; email: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(verifyEmailCode, undefined);
  const [resendState, resend] = useActionState<AuthFormState, FormData>(resendVerificationCode, undefined);
  return (
    <div className="flex flex-col gap-[18px]">
      <form action={action} className="flex flex-col gap-[18px]">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={email} />
        <FormMessage kind="error">{state?.error ?? resendState?.error}</FormMessage>
        <FormMessage kind="notice">{!state?.error && resendState?.notice}</FormMessage>
        <OtpField />
        <SubmitButton className="w-full" pendingLabel="Verificando…">
          Verificar
        </SubmitButton>
      </form>
      <form action={resend} className="flex justify-center">
        <input type="hidden" name="email" value={email} />
        <SubmitButton variant="ghost" pendingLabel="Enviando…">
          Mandarme otro código
        </SubmitButton>
      </form>
    </div>
  );
}

export function ForgotPasswordForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(requestPasswordReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="next" value={next} />
      <FormMessage kind="error">{state?.error}</FormMessage>
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Enviando…">
        Mandarme el código
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ next, email }: { next: string; email: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="email" value={email} />
      <FormMessage kind="error">{state?.error}</FormMessage>
      <OtpField />
      <Field id="password" label="Contraseña nueva" hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}

function OtpField() {
  return (
    <Field id="otp" label="Código de 6 números">
      <Input
        id="otp"
        name="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        className="text-center text-lg tracking-[0.4em]"
      />
    </Field>
  );
}
