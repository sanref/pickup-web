import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "No encontrado" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="flex w-full max-w-[460px] flex-col items-start gap-[18px] rounded-lg bg-background px-6 py-8 shadow-lg sm:px-[34px] sm:py-9">
        <Link href="/" className="font-display text-[23px] leading-none text-text no-underline">
          PickUp
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[29px] leading-tight font-bold tracking-[-0.03em]">Acá no hay nada</h1>
          <p className="m-0 text-sm text-text-2">
            La página no existe o no tenés acceso. Puede que el partido o la sede se hayan dado de baja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sedes">Ver sedes</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
