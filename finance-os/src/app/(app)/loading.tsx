import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <Card>
            <Skeleton className="mb-4 h-3 w-20" />
            <Skeleton className="mb-4 h-10 w-48" />
            <Skeleton className="h-[110px] w-full" />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <Card className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-24" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
