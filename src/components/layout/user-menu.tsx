"use client";

import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { UserAvatar } from "@/components/profile/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
  avatarUrl,
  isAdmin,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de tu cuenta"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <UserAvatar name={name} src={avatarUrl} className="size-11 sm:size-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-md bg-background p-1.5 shadow-md">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="truncate text-xs text-neutral-700">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">Mi perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/mis-partidos">Mis partidos</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/sedes">Moderar sedes</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut} className="w-full">
            <button type="submit" className="w-full text-left">
              Cerrar sesión
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
