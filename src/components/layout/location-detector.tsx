"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { locateUser, markLocationDenied } from "@/lib/user-location";

// Primera visita: pide la ubicación y recarga los datos del servidor para centrar mapas y búsquedas en su ciudad.
// Si la rechaza (o falla) queda marcado y no se vuelve a pedir; igual puede elegirla a mano en "Zona".
export function LocationDetector({ asked }: { asked: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (asked) return;
    locateUser()
      .then(() => router.refresh())
      .catch(() => markLocationDenied());
  }, [asked, router]);
  return null;
}
