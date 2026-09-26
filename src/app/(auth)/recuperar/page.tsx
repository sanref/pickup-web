import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { safeNext, withNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/recuperar">) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthCard title="Recuperar contraseña" description="Te mandamos un código al email para que elijas una contraseña nueva.">
      <ForgotPasswordForm next={next} />
      <span className="text-center text-[13px] text-text-3">
        <Link href={withNext("/login", next)}>Volver a iniciar sesión</Link>
      </span>
    </AuthCard>
  );
}
