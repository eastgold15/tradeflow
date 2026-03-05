"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageComponent } from "@/components/common/Image"; // 确保路径正确
import { useCurrentAdsList } from "@/hooks/api/ads-hook";
import { useNavbarStore } from "@/lib/store/navbar-store";
import { cn, useIsDesktop } from "@/lib/utils";

const Ad: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();
  const navbarHeight = useNavbarStore((state) => state.navbarHeight);
  const isDesktop = useIsDesktop();

  const { data: ads, isLoading } = useCurrentAdsList();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 桌面端动态计算高度 CSS 变量
  const navbarHeightStyle =
    navbarHeight > 0
      ? ({ "--navbar-height": `${navbarHeight}px` } as React.CSSProperties)
      : {};

  // 轮播逻辑
  useEffect(() => {
    if (!ads || ads.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [ads, isPaused]);

  // 1. 全局加载状态：如果广告列表还在加载，显示一个占位容器
  if (isLoading) {
    return (
      <section
        className="relative w-full overflow-hidden bg-muted/10 md:h-[calc(100vh-var(--navbar-height))]"
        style={navbarHeightStyle}
      >
        <ImageComponent alt="Loading..." fill={isDesktop} showSkeleton={true} />
      </section>
    );
  }

  if (!ads || ads.length === 0) return null;

  const handleClick = (link?: string) => {
    if (link) router.push(link);
  };

  return (
    <section
      className={cn(
        "group relative w-full overflow-hidden transition-all",
        "md:h-[calc(100vh-var(--navbar-height))]", // 桌面端固定高度
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={navbarHeightStyle}
    >
      {/* 图片容器 */}
      <div className="relative h-full w-full">
        {ads.map((ad, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              className={cn(
                "w-full cursor-pointer transition-opacity duration-1000 ease-in-out",
                // 🌟 核心布局：
                // 桌面端：全部绝对定位重叠，靠 opacity 切换
                // 移动端：只有激活的图 relative 占位，其它的 absolute 隐藏
                isDesktop
                  ? "absolute inset-0"
                  : isActive
                    ? "relative"
                    : "pointer-events-none absolute inset-0",
                isActive ? "z-10 opacity-100" : "z-0 opacity-0"
              )}
              key={ad.id}
              onClick={() => handleClick(ad.link)}
            >
              <ImageComponent
                alt={ad.title || "Advertisement"}
                aspectRatio={isDesktop ? "h-full" : "aspect-[16/9]"}
                // 🌟 智能开关：大屏填满盒子，小屏自适应撑开
                className="object-cover"
                // 🌟 性能：首张图预加载
                fill={isDesktop}
                // 🌟 体验：移动端未加载出图片时，先占好 16:9 的位置显示骨架屏
                imageId={ad.mediaId}
                // 告诉浏览器针对不同屏幕下载多大的图
                priority={index === 0}
                sizes="100vw"
              />
            </div>
          );
        })}

        {/* 左右导航按钮 */}
        {ads.length > 1 && (
          <>
            {/* 上一张按钮 */}
            <button
              aria-label="上一张广告"
              className={cn(
                "absolute top-1/2 left-4 z-20 flex -translate-y-1/2",
                "flex h-12 w-12 items-center justify-center",
                "rounded-full bg-black/20 text-white backdrop-blur-sm",
                "transition-all duration-300",
                "hover:scale-110 hover:bg-black/40",
                "focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2",
                "active:scale-95",
                // 响应式显示逻辑：移动端默认隐藏，桌面端始终可见，group-hover时显示
                "opacity-0 group-hover:opacity-100 md:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
              }}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* 下一张按钮 */}
            <button
              aria-label="下一张广告"
              className={cn(
                "absolute top-1/2 right-4 z-20 flex -translate-y-1/2",
                "flex h-12 w-12 items-center justify-center",
                "rounded-full bg-black/20 text-white backdrop-blur-sm",
                "transition-all duration-300",
                "hover:scale-110 hover:bg-black/40",
                "focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2",
                "active:scale-95",
                // 响应式显示逻辑：移动端默认隐藏，桌面端始终可见，group-hover时显示
                "opacity-0 group-hover:opacity-100 md:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev + 1) % ads.length);
              }}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}

        {/* 指示器 (Dots) */}
        {ads.length > 1 && (
          <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
            {ads.map((_, index) => (
              <button
                aria-label={`Go to slide ${index + 1}`}
                className={cn(
                  "h-1.5 rounded-full shadow-sm transition-all duration-300",
                  index === currentIndex
                    ? "w-8 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/80"
                )}
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Ad;
