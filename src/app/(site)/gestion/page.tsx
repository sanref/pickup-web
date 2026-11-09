import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { listManagedVenues } from "@/server/services/venue-admin";

export const metadata: Metadata = { title: "Mis sedes" };

export default async function ManagedVenuesPage() {
  const actor = await requireActor("/gestion");
  const venues = await listManagedVenues(actor);
  const admin = isAdmin(actor);

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8 min-[900px]:px-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[34px] leading-tight font-bold tracking-[-0.03em]">Mis sedes</h1>
        <p className="m-0 text-sm text-text-2">
          {venues.length > 0
            ? "Gestioná las canchas, los turnos y los datos de tus sedes."
            : admin
              ? "No tenés sedes asignadas. Como admin podés gestionar cualquiera desde su página, con “Gestionar sede”."
              : "Todavía no administrás ninguna sede. Si sos dueño o encargado de una, pedile a PickUp que te la asigne."}
        </p>
      </div>
      {venues.length > 0 && (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {venues.map((v) => (
            <li key={v.id}>
              <Link
                href={`/gestion/${v.id}/turnos`}
                className="flex h-full flex-col gap-2 rounded-md border-2 border-edge bg-surface p-4 text-text no-underline shadow-sm transition-colors duration-150 hover:border-coral"
              >
                <span className="font-semibold">{v.name}</span>
                <span className="text-sm text-text-2">
                  {v.address} · {v.city}
                </span>
                <span className="text-xs text-text-3">
                  {v.courts === 0 ? "Sin canchas cargadas" : v.courts === 1 ? "1 cancha activa" : `${v.courts} canchas activas`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
