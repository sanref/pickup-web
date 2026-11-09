"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/auth/auth-card";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VenueManagerRow } from "@/server/services/venue-admin";
import { addVenueManagerAction, removeVenueManagerAction } from "../../actions";

export function ManagersSection({
  venueId,
  managers,
  canEdit,
  currentUserId,
}: {
  venueId: string;
  managers: VenueManagerRow[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addVenueManagerAction(venueId, { email });
      if (!result.ok) return setError(result.error);
      setEmail("");
      toast.success("Sumamos al admin de la sede.");
    });
  }

  function remove(manager: VenueManagerRow) {
    if (!window.confirm(`¿Sacarle a ${manager.displayName} la gestión de esta sede?`)) return;
    startTransition(async () => {
      const result = await removeVenueManagerAction(venueId, manager.userId);
      if (result.ok) toast.success("Listo.");
      else toast.error(result.error);
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[21px] tracking-[-0.02em]">Admins de la sede</h2>
        <p className="m-0 text-sm text-text-2">
          Pueden editar estos datos, las canchas y los turnos.
          {canEdit ? "" : " Para sumar o sacar a alguien, escribile a PickUp."}
        </p>
      </div>
      {managers.length === 0 ? (
        <p className="m-0 text-sm text-text-3">Esta sede todavía no tiene admins asignados.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {managers.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-md border border-edge bg-surface px-3 py-2.5">
              <UserAvatar name={m.displayName} src={m.avatarUrl} className="size-9" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">
                  {m.displayName}
                  {m.userId === currentUserId && <span className="font-normal text-text-3"> · vos</span>}
                </span>
                {m.email && <span className="truncate text-xs text-text-3">{m.email}</span>}
              </div>
              {canEdit && (
                <Button variant="destructive" size="sm" disabled={pending} onClick={() => remove(m)}>
                  Sacar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <form onSubmit={add} className="flex flex-col gap-2">
          <FormMessage kind="error">{error}</FormMessage>
          <div className="flex flex-wrap gap-2">
            <Input
              type="email"
              value={email}
              required
              placeholder="email de la cuenta de PickUp"
              aria-label="Email del nuevo admin de la sede"
              className="min-w-[220px] flex-1"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="navy" disabled={pending} aria-busy={pending}>
              Sumar admin
            </Button>
          </div>
          <span className="text-xs text-text-3">La persona tiene que tener una cuenta creada en PickUp.</span>
        </form>
      )}
    </section>
  );
}
