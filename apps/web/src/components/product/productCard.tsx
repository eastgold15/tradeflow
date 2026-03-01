import Image from "next/image";
import Link from "next/link";
import React from "react";
import { ProductListRes } from "@/hooks/api/site-product.type";

interface ProductCardProps {
  product: ProductListRes["items"][0];
  aspectRatio?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  aspectRatio = "aspect-[4/3]",
}) => {
  // 确保有主图，否则显示占位图（可选）
  const mainImage = product.mainMedia || "/placeholder.jpg";

  // 悬停图：优先用 additionalImages[0]，否则回退到主图
  const hoverImage = product.mainMedia || mainImage;

  // 检测是否为视频文件
  const isVideo = (url: string) => {
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
    return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  return (
    <Link
      className="group flex cursor-pointer flex-col items-center"
      href={`/product/${product.slug}`}
    >
      <div
        className={`relative w-full ${aspectRatio} mb-6 overflow-hidden bg-gray-50/50`}
      >
        {/* Main Media - Image or Video */}
        {isVideo(mainImage) ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            loop
            muted
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            playsInline
            src={mainImage}
          />
        ) : (
          <>
            <Image
              alt={product.displayName}
              className="absolute inset-0 h-full w-full transform object-contain opacity-100 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-0"
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              src={mainImage}
            />

            {/* Hover Image */}
            {!isVideo(hoverImage) && (
              <Image
                alt={`${product.displayName} alternate`}
                className="absolute inset-0 h-full w-full scale-105 transform object-contain opacity-0 mix-blend-multiply transition-all duration-700 group-hover:opacity-100"
                fill
                loading="lazy"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                src={hoverImage}
              />
            )}
          </>
        )}

        {/* {product.isNew && (
          <span className="absolute top-2 left-2 bg-black px-2 py-1 font-bold text-[8px] text-white uppercase tracking-widest">
            New In
          </span>
        )} */}
      </div>

      <div className="text-center">
        <h3 className="mb-1 font-serif text-black text-lg italic decoration-1 underline-offset-4 group-hover:underline md:text-xl">
          {product.displayName}
        </h3>

        {product.displayName && (
          <p className="mb-2 font-serif text-gray-500 text-sm italic">
            {product.isFeatured ? "Featured" : ""}
          </p>
        )}

        <p className="font-bold text-xs tracking-widest">
          RETAIL USD {product.minPrice?.toLocaleString() ?? "N/A"}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;
