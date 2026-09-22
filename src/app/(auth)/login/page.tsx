import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, FormMessage, OrDivider } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { GoogleButton } from "@/components/auth/google-button";
import { safeNext, withNext } from "@/lib/safe-next";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSessionUser()) redirect(next);

  const notice = params.verificado
    ? "Listo, verificaste tu email. Ya podés iniciar sesión."
    : params.contrasena
      ? "Guardamos tu contraseña nueva. Ya podés iniciar sesión."
      : null;

  return (
    <AuthCard
      title="Entrá y sumate"
      description={next !== "/" ? "Te llevamos de vuelta al partido que estabas mirando." : "Votá horarios, sumate a partidos y armá los tuyos."}
    >
      <FormMessage kind="notice">{notice}</FormMessage>
      <FormMessage kind="error">{params.error === "google" && "No pudimos abrir Google. Probá de nuevo."}</FormMessage>
      <GoogleButton next={next} />
      <OrDivider />
      <LoginForm next={next} />
      <span className="text-center text-[13px] text-neutral-700">
        ¿No tenés cuenta? <Link href={withNext("/registro", next)}>Crear una</Link>
      </span>
    </AuthCard>
  );
}
