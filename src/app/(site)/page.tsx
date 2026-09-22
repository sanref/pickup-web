import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Landing provisoria de la fase 1: hero y "Cómo funciona" con el copy del handoff.
// El buscador y las tarjetas "Cerca tuyo" se conectan a datos reales en la fase de explorar.
const STEPS = [
  {
    title: "Proponé horarios",
    body: "Elegís la sede y dos o tres fechas posibles. No hace falta que estén todos.",
  },
  {
    title: "Cada uno marca lo que le sirve",
    body: "Una grilla simple muestra quién puede y cuándo. Se actualiza en vivo.",
  },
  {
    title: "Se confirma y se juega",
    body: "Cuando una opción llega al cupo, avisamos a todos con la cancha y el horario.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="flex flex-col gap-5 px-4 pt-8 pb-12 min-[900px]:px-10">
        <Badge variant="accent-2" className="self-start">
          Rosario · fútbol, pádel, vóley y más
        </Badge>
        <h1 className="text-[40px] leading-[1.05] sm:text-[52px]">
          Te faltan tres
          <br />
          para el fútbol 5
        </h1>
        <p className="max-w-[440px] text-[17px] text-neutral-800">
          Publicá el partido con dos o tres horarios posibles. Los que se suman
          votan cuál les sirve y el partido se confirma solo cuando llega al
          cupo.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href="/explorar">Buscar partidos</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/partidos/nuevo">Armar uno</Link>
          </Button>
        </div>
      </section>

      <section
        id="como-funciona"
        className="grid gap-7 px-4 pt-2 pb-12 sm:grid-cols-3 min-[900px]:px-10"
      >
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col gap-2">
            <span className="font-heading text-4xl text-accent">{i + 1}</span>
            <span className="text-[17px] font-bold">{step.title}</span>
            <span className="text-sm text-neutral-800">{step.body}</span>
          </div>
        ))}
      </section>
    </>
  );
}
