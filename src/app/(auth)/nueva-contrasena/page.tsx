import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/forms";
import { safeNext, withNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Contraseña nueva" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/nueva-contrasena">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const email = typeof params.email === "string" ? params.email : "";
  if (!email) redirect(withNext("/recuperar", next));

  return (
    <AuthCard
      title="Contraseña nueva"
      description={
        <>
          Si <strong className="font-semibold">{email}</strong> tiene cuenta, le llegó un código. Ingresalo junto con tu
          contraseña nueva.
        </>
      }
    >
      <ResetPasswordForm next={next} email={email} />
      <span className="text-center text-[13px] text-neutral-700">
        <Link href={withNext("/recuperar", next)}>Usar otro email</Link>
      </span>
    </AuthCard>
  );
}
