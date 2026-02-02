"use client";

import { ImageComponent } from "@/components/common/Image"; // 确保路径正确
import { useCurrentAdsList } from "@/hooks/api/ads-hook";
import { useNavbarStore } from "@/lib/store/navbar-store";
import { cn, useIsDesktop } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Ad: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();
  const navbarHeight = useNavbarStore((state) => state.navbarHeight);
  const isDesktop = useIsDesktop();

  const { data: ads, isLoading } = useCurrentAdsList();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 桌面端动态计算高度 CSS 变量
  const navbarHeightStyle = navbarHeight > 0
    ? { '--navbar-height': `${navbarHeight}px` } as React.CSSProperties
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
        <ImageComponent alt="Loading..." showSkeleton={true} fill={isDesktop} />
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
        "relative w-full overflow-hidden  transition-all",
        "md:h-[calc(100vh-var(--navbar-height))]", // 桌面端固定高度
        className
      )}
      style={navbarHeightStyle}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 图片容器 */}
      <div className="relative w-full h-full">
        {ads.map((ad, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={ad.id}
              className={cn(
                "w-full cursor-pointer transition-opacity duration-1000 ease-in-out",
                // 🌟 核心布局：
                // 桌面端：全部绝对定位重叠，靠 opacity 切换
                // 移动端：只有激活的图 relative 占位，其它的 absolute 隐藏
                isDesktop ? "absolute inset-0" : (isActive ? "relative" : "absolute inset-0 pointer-events-none"),
                isActive ? "z-10 opacity-100" : "z-0 opacity-0"
              )}
              onClick={() => handleClick(ad.link)}
            >
              <ImageComponent
                imageId={ad.mediaId}
                alt={ad.title || "Advertisement"}
                // 🌟 智能开关：大屏填满盒子，小屏自适应撑开
                fill={isDesktop}
                // 🌟 性能：首张图预加载
                priority={index === 0}
                // 🌟 体验：移动端未加载出图片时，先占好 16:9 的位置显示骨架屏
                aspectRatio={!isDesktop ? "aspect-[16/9]" : "h-full"}
                // 告诉浏览器针对不同屏幕下载多大的图
                sizes="100vw"
                className="object-cover"
              />
            </div>
          );
        })}

        {/* 指示器 (Dots) */}
        {ads.length > 1 && (
          <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
            {ads.map((_, index) => (
              <button
                key={index}
                aria-label={`Go to slide ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "h-1.5 rounded-full shadow-sm transition-all duration-300",
                  index === currentIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Ad;