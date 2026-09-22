import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/components/auth/forms";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Verificar email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verificar-email">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const email = typeof params.email === "string" ? params.email : "";
  if (!email) redirect("/registro");

  return (
    <AuthCard
      title="Revisá tu email"
      description={
        <>
          Te mandamos un código a <strong className="font-semibold">{email}</strong>. Hasta verificarlo podés mirar
          partidos, pero no sumarte.
        </>
      }
    >
      <VerifyEmailForm next={next} email={email} />
    </AuthCard>
  );
}
