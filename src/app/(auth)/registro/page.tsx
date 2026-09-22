import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, OrDivider } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/forms";
import { GoogleButton } from "@/components/auth/google-button";
import { safeNext, withNext } from "@/lib/safe-next";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);

  return (
    <AuthCard title="Crear cuenta" description="Con la cuenta podés votar horarios, sumarte y armar partidos.">
      <GoogleButton next={next} />
      <OrDivider />
      <RegisterForm next={next} />
      <span className="text-center text-[13px] text-neutral-700">
        ¿Ya tenés cuenta? <Link href={withNext("/login", next)}>Iniciar sesión</Link>
      </span>
    </AuthCard>
  );
}
