import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InviteNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="flex w-full max-w-[460px] flex-col items-start gap-[18px] rounded-lg bg-background px-6 py-8 shadow-lg sm:px-[34px] sm:py-9">
        <Link href="/" className="font-display text-[23px] leading-none text-text no-underline">
          PickUp
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[29px] leading-tight font-bold tracking-[-0.03em]">Esta invitación no funciona</h1>
          <p className="m-0 text-sm text-text-2">
            El link está incompleto o el partido ya no existe. Pedile a quien te lo mandó que lo comparta de nuevo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href="/explorar">Buscar partidos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
