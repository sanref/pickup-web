import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto con la forma final de /explorar (sin spinners, handoff).
export default function ExploreLoading() {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] items-start gap-6 px-4 pt-4 pb-10 min-[900px]:grid-cols-[1fr_380px] min-[900px]:px-10 min-[1200px]:grid-cols-[230px_1fr_420px]">
      <div className="hidden flex-col gap-5 min-[1200px]:flex">
        <Skeleton className="h-11 rounded-full" />
        <Skeleton className="h-24" />
        <Skeleton className="h-10" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-12 w-64" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px]" />
        ))}
      </div>
      <Skeleton className="hidden h-[620px] rounded-lg min-[900px]:block" />
    </div>
  );
}
