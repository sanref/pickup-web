import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto con la forma final de /explorar (sin spinners, handoff).
export default function ExploreLoading() {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] items-start gap-[26px] px-4 pt-4 pb-11 min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:px-10 min-[900px]:pt-[26px] min-[1200px]:grid-cols-[230px_minmax(0,1fr)_auto]">
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
      <Skeleton className="hidden h-[600px] rounded-lg min-[900px]:block min-[900px]:w-[400px]" />
    </div>
  );
}
