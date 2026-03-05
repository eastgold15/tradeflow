"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ProductDetail from "@/components/product/ProductDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductDetailBySlug } from "@/hooks/api/site-product";
export const dynamic = "force-dynamic";

export default function ProductPage() {
  const { slug } = useParams();
  const productSlug = Array.isArray(slug) ? slug[0] : slug;

  const { data, isLoading, error } = useProductDetailBySlug(productSlug!);

  if (isLoading) {
    return (
      <>
        {/* 使用骨架屏模拟详情页布局，防止布局抖动 (CLS) */}
        <div className="mx-auto max-w-325 px-6 py-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* 左侧：图片骨架 */}
            <div className="flex flex-col items-center lg:col-span-7">
              <Skeleton
                className="aspect-4/3 w-full rounded-none bg-gray-100"
                variant="rectangle"
              />
              <div className="mt-4 flex w-full gap-4 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    className="h-20 w-20 shrink-0 bg-gray-100"
                    key={i}
                  />
                ))}
              </div>
            </div>
            {/* 右侧：信息骨架 */}
            <div className="space-y-8 pt-8 pl-4 lg:col-span-5">
              <div>
                <Skeleton className="mb-4 h-12 w-3/4 bg-gray-100" />
                <Skeleton className="h-6 w-1/3 bg-gray-100" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full bg-gray-100" />
                <Skeleton className="h-10 w-full bg-gray-100" />
              </div>
              <Skeleton className="mt-8 h-16 w-full bg-gray-100" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 font-serif text-4xl italic">Product not found</h1>
        <p className="mb-8 text-gray-500">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/shop">
          <button className="bg-black px-8 py-3 font-bold text-white text-xs uppercase tracking-widest transition-colors hover:bg-gray-800">
            Back to Shop
          </button>
        </Link>
      </div>
    );
  }

  return <ProductDetail siteProduct={data} />;
}
