"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { signOut } from "@/app/(auth)/actions";
import { Field, FormMessage } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { changePasswordAction, type ActionResult } from "./actions";

export function AccountBlock({
  email,
  emailVerified,
  hasPassword,
  hasGoogle,
}: {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
}) {
  const status = [emailVerified ? "Verificado" : "Sin verificar", hasGoogle && "vinculado con Google"]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-[21px] tracking-[-0.02em]">Cuenta</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border-inset bg-inset px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{email}</span>
          <span className="text-xs text-text-3">{status}</span>
        </div>
        {hasPassword && <ChangePasswordDialog />}
      </div>
      <form action={signOut} className="flex">
        <SubmitButton variant="outline" className="ml-auto" pendingLabel="Saliendo…">
          Cerrar sesión
        </SubmitButton>
      </form>
    </section>
  );
}

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(async (prev, form) => {
    const result = await changePasswordAction(prev, form);
    if (result.ok) {
      setOpen(false);
      toast.success("Cambiamos tu contraseña.");
    }
    return result;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">Cambiar contraseña</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Se cierra la sesión en tus otros dispositivos.</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <FormMessage kind="error">{state && !state.ok && state.error}</FormMessage>
          <Field id="currentPassword" label="Contraseña actual">
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field id="newPassword" label="Contraseña nueva" hint="Mínimo 8 caracteres.">
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar contraseña
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
