"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentMediaDetail } from "@/hooks/api/meida-hook";
import { cn } from "@/lib/utils";
import { AlertCircle, ImageIcon } from "lucide-react";
import Image, { ImageProps as NextImageProps } from "next/image";
import { useState, useEffect } from "react";

// 定义组件接收的属性，继承 NextImageProps 并将 src 设为可选
interface ImageProps extends Omit<NextImageProps, "src"> {
  imageId?: string | null | undefined; // 支持通过 ID 自动获取图片地址
  src?: string;                         // 也支持直接传入 URL
  aspectRatio?: string;                 // 控制容器比例 (如 aspect-video)
  showSkeleton?: boolean;               // 是否启用骨架屏
  keepSkeletonOnError?: boolean;        // 出错时是否继续显示骨架
  containerClassName?: string;          // 专门给外层容器的样式
}

export const ImageComponent: React.FC<ImageProps> = ({
  imageId,
  src,
  alt,
  className,
  containerClassName,
  fill = true, // 默认推荐开启 fill，配合父级容器控制
  aspectRatio,
  showSkeleton = true,
  keepSkeletonOnError = false,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  ...restProps
}) => {
  // 状态管理
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // 1. 处理 API 获取逻辑
  const shouldFetch = !src && !!imageId;
  const { data: remoteUrl, isLoading: isQueryLoading } = useCurrentMediaDetail(
    shouldFetch ? imageId! : ""
  );

  const finalSrc = src || remoteUrl;

  // 2. 监听 src 变化，如果 src 变了重置加载状态（用于轮播图复用组件场景）
  useEffect(() => {
    if (finalSrc) {
      setIsImgLoading(true);
      setIsError(false);
    }
  }, [finalSrc]);

  // 3. 骨架屏显示逻辑
  const shouldShowSkeleton =
    showSkeleton &&
    (isQueryLoading || (isImgLoading && !isError) || (isError && keepSkeletonOnError));

  return (
    <div
      className={cn(
        "relative overflow-hidden group bg-muted/20",
        fill ? "h-full w-full" : "w-full h-auto", // 自动适配 fill 模式下的容器
        aspectRatio,
        containerClassName
      )}
    >
      {/* --- 第一层：骨架屏 --- */}
      {shouldShowSkeleton && (
        <Skeleton className="absolute inset-0 z-10 h-full w-full animate-pulse bg-muted/60" />
      )}

      {/* --- 第二层：异常状态 (报错/空数据) --- */}
      {isError && !keepSkeletonOnError && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
          <AlertCircle className="h-6 w-6 opacity-40" />
          <span className="text-[10px] mt-1">Load Failed</span>
        </div>
      )}

      {/* --- 第三层：主图片 --- */}

      {finalSrc ? (
        <Image
          alt={alt || "image"}
          src={finalSrc}
          fill={fill}
          // 🌟 关键修复：当非 fill 模式时，提供默认宽度和高度
          // 这里的数字不代表最终显示大小，而是为了给 Next.js 提供比例参考
          {...(!fill && { width: 1920, height: 1080 })}

          priority={priority}
          sizes={sizes}
          className={cn(
            "transition-all duration-700 ease-in-out",
            // 🌟 重点：非 fill 模式必须配合 relative，否则 h-auto 会失效
            fill ? "object-cover h-full w-full" : "h-auto w-full relative block",
            isImgLoading || isError ? "opacity-0" : "opacity-100",
            className
          )}
          onLoad={() => setIsImgLoading(false)}
          onError={() => {
            setIsImgLoading(false);
            setIsError(true);
          }}
          {...restProps}
        />
      ) : (
        // 如果连地址都没有，显示占位图标
        !isQueryLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 opacity-20" />
          </div>
        )
      )
      }

    </div>
  );
};

export default ImageComponent;