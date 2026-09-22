"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reemplazo del Realtime del handoff: vuelve a pedir la página al servidor cada `intervalMs`
// mientras la pestaña está visible, y apenas vuelve a estarlo.
export function LiveRefresh({ intervalMs = 8000, paused = false }: { intervalMs?: number; paused?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (paused) return;
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    const timer = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs, paused]);

  return null;
}
