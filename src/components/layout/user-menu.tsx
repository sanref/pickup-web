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
  managesVenues,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  /** Es admin de alguna sede. */
  managesVenues: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de tu cuenta"
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
      >
        <UserAvatar name={name} src={avatarUrl} className="size-11 sm:size-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-md bg-surface p-1.5 shadow-md">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-sm font-semibold text-text">{name}</span>
          <span className="truncate text-xs text-text-3">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">Mi perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/mis-partidos">Mis partidos</Link>
        </DropdownMenuItem>
        {managesVenues && (
          <DropdownMenuItem asChild>
            <Link href="/gestion">Mis sedes</Link>
          </DropdownMenuItem>
        )}
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
