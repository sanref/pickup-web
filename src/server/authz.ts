import "server-only";
import { notFound } from "next/navigation";
import type { Actor } from "@/server/auth/session";

export function isAdmin(actor: Actor | null): boolean {
  return actor?.user.role === "admin";
}

// Para un no-admin la ruta directamente no existe: no revelamos que hay un panel.
export function assertAdmin(actor: Actor | null): asserts actor is Actor {
  if (!isAdmin(actor)) notFound();
}
