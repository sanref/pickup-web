import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActor } from "@/server/auth/session";
import { isAdmin } from "@/server/authz";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/sedes", label: "Sedes" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

// Barra del handoff: fondo surface, marca en Caprasimo 24px a la izquierda.
// Sin sesión: "Iniciar sesión" + "Crear partido". Con sesión: "Crear partido" + avatar con menú.
export async function SiteHeader() {
  const actor = await getActor();
  return (
    <header className="flex items-center gap-7 bg-surface px-4 py-4 min-[900px]:px-10 min-[900px]:py-5">
      <Link href="/" className="mr-auto font-heading text-2xl text-foreground no-underline">
        PickUp
      </Link>
      <nav className="hidden items-center gap-7 min-[900px]:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-foreground no-underline transition-colors duration-150 ease-out hover:text-accent aria-[current=page]:text-accent"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2.5">
        {!actor && (
          <Button variant="secondary" asChild className="hidden sm:inline-flex">
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
          />
        )}
      </div>
    </header>
  );
}
