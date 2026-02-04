import { Suspense } from "react";
import CategoryClient from "@/components/CategoryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryPage() {


  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-480 px-4 pt-32 md:px-8 lg:px-12">
          <div className="mb-12 text-center">
            <Skeleton className="mx-auto mb-4 h-10 w-48 bg-gray-100" />
            <Skeleton className="mx-auto h-4 w-96 bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="space-y-4" key={i}>
                <Skeleton className="aspect-3/4 w-full bg-gray-100" />
                <Skeleton className="mx-auto h-4 w-2/3 bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <CategoryClient />
    </Suspense>
  );
}
