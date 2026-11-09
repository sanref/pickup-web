import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { hasManagedVenues } from "@/server/services/venue-admin";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/sedes", label: "Sedes" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

// Barra del handoff v2: fondo navy, logo en Graduate 23px a la izquierda, link activo en coral.
// Sin sesión: "Iniciar sesión" en outline claro + "Crear partido". Con sesión: "Crear partido" + avatar con menú.
// Siempre fija arriba; su alto es --site-header-h, que usan los demás elementos sticky para quedar debajo.
export async function SiteHeader() {
  const actor = await getActor();
  const managesVenues = actor ? await hasManagedVenues(actor.user.id) : false;
  return (
    <header className="sticky top-0 z-40 flex h-(--site-header-h) shrink-0 items-center gap-[26px] bg-navy px-4 min-[900px]:px-10">
      <Link href="/" className="mr-auto font-display text-[23px] text-surface no-underline">
        PickUp
      </Link>
      <nav className="hidden items-center gap-[26px] min-[900px]:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-navy-200 no-underline transition-colors duration-150 ease-out hover:text-coral aria-[current=page]:text-coral"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2.5">
        {!actor && (
          <Button variant="outline-light" asChild className="hidden sm:inline-flex">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        )}
        <Button asChild>
          <Link href="/partidos/nuevo">Crear partido</Link>
        </Button>
        {actor && (
          <UserMenu
            name={actor.profile.displayName}
            email={actor.user.email}
            avatarUrl={actor.profile.avatarUrl}
            isAdmin={isAdmin(actor)}
            managesVenues={managesVenues}
          />
        )}
      </div>
    </header>
  );
}
