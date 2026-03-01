"use client";

import { useRouter } from "next/navigation";
import type React from "react";

import { useSiteProductList } from "@/hooks/api/site-category";
import { BaseImage } from "../common/Image/baseImage";
import { Skeleton } from "../ui/skeleton";

interface ShopProps {
  onProductSelect?: (productId: string) => void;
}

const ShopSkeleton = () => (
  <div className="grid w-full max-w-2xl grid-cols-2 gap-x-8 gap-y-16">
    {Array.from({ length: 4 }).map((_, i) => (
      <div className="flex flex-col items-center" key={i}>
        {/* 匹配图片的 aspect-[4/3] */}
        <Skeleton className="mb-6 aspect-4/3 w-full" />
        {/* 匹配标题文字 */}
        <Skeleton className="h-6 w-24" />
      </div>
    ))}
  </div>
);

const Shop: React.FC<ShopProps> = ({ onProductSelect }) => {
  const router = useRouter();
  const { data, isLoading, error } = useSiteProductList({ limit: 4 });

  // 1. 优先处理加载
  if (isLoading) return <ShopSkeleton />;

  // 2. 错误处理 (建议不渲染任何内容或渲染一个简单的提示)
  if (error || !data) return null;

  const products = data.items || [];

  return (
    <div className="flex h-150 md:h-full w-full flex-col items-center justify-center bg-white p-4 md:p-3">
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-x-3 gap-y-4">
        {products.slice(0, 4).map((product) => (
          <div
            className="group flex cursor-pointer flex-col items-center justify-center"
            key={product.siteProductId}
            onClick={() => router.push(`/product/${product.slug}`)}
          >
            {/* 🔥 图片容器：使用 flex-1 占据除了文字外的所有空间，并用 relative 配合 BaseImage */}
            <div className="relative min-h-0 w-full flex-1">
              <BaseImage
                alt={product.displayName}
                // 关键：imageId 用于 Nexus Flow 的数据追踪
                className="object-contain"
                // className 控制图片在盒子里的展示方式

                containerClassName="absolute inset-0 bg-white/10 rounded-sm"
                // 让 BaseImage 内部 div 绝对定位填满这个 flex-1 的空间
                imageUrl={product.mainMedia}
              />
            </div>

            {/* 文字部分：使用 shrink-0 防止文字区域被压缩 */}
            <h3 className="mt-1 shrink-0 text-center font-serif text-[10px] text-black italic transition-colors group-hover:text-gray-600 md:text-2xl">
              {product.displayName}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
