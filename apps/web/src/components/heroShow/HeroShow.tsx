"use client";
import Link from "next/link";
import type React from "react";
import { ImageComponent } from "@/components/common/Image";
import {
  type HeroCardListRes,
  useCurrentHeroCardsList,
} from "@/hooks/api/hero-cards-hook";
import { useNavbarStore } from "@/lib/store/navbar-store";
import { cn, useIsDesktop } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import Shop from "./Shop";

interface ContentBlockProps {
  bgColor: string;
  titleColor: string;
  subtitleColor: string;
  buttonBg: string;
  buttonText: string;
  buttonHover: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
  buttonUrl?: string;
  buttonTextContent?: string;
  navbarHeightStyle?: React.CSSProperties;
  isDesktop: boolean; // 传入状态
}

const ContentBlock: React.FC<ContentBlockProps> = ({
  bgColor,
  titleColor,
  subtitleColor,
  buttonBg,
  buttonText,
  buttonHover,
  children,
  title,
  description,
  buttonUrl,
  buttonTextContent,
  navbarHeightStyle,
  isDesktop,
}) => (
  <div
    className={cn("grid w-full grid-cols-1", bgColor)}
    style={{
      // 核心：大屏固定高度，小屏 auto 让图片比例撑开
      gridTemplateRows: isDesktop
        ? "calc(100vh - var(--navbar-height)) auto"
        : "auto auto",
      ...navbarHeightStyle,
    }}
  >
    {/* 1. 图片行 */}
    <div
      className={cn(
        "relative w-full overflow-hidden",
        // 小屏下不给固定高度，靠 ImageComponent 撑开
        isDesktop ? "h-full" : "h-auto"
      )}
    >
      {children}
    </div>

    {/* 2. 文字行 */}
    {title || description || buttonUrl ? (
      <div className="flex min-h-40 flex-col justify-center p-8 md:p-12">
        {title && (
          <h3
            className={`mb-4 font-serif text-2xl italic md:text-4xl ${titleColor}`}
          >
            {title}
          </h3>
        )}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          {description && (
            <p
              className={`max-w-xl text-sm leading-relaxed tracking-wide md:text-base ${subtitleColor}`}
            >
              {description}
            </p>
          )}
          {buttonUrl && (
            <Link href={buttonUrl}>
              <button
                className={`shrink-0 px-10 py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105 ${buttonBg} ${buttonText} ${buttonHover}`}
                type="button"
              >
                {buttonTextContent || "EXPLORE"}
              </button>
            </Link>
          )}
        </div>
      </div>
    ) : null}
  </div>
);

/**
 * HeroShow 组件
 * 使用 ContentBlock 来简化结构
 */
export const HeroShowComponent: React.FC = () => {
  const { data: heroCards, isLoading, error } = useCurrentHeroCardsList();
  const isDesktop = useIsDesktop();

  // 从 store 获取 navbar 高度
  const navbarHeight = useNavbarStore((state) => state.navbarHeight);
  const navbarHeightStyle =
    navbarHeight > 0
      ? ({ "--navbar-height": `${navbarHeight}px` } as React.CSSProperties)
      : {};

  if (isLoading) {
    return (
      <section className="min-h-screen w-full" style={navbarHeightStyle}>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="flex flex-col" key={i}>
              <Skeleton
                className="h-[55vh] md:h-[calc(100vh-var(--navbar-height))]"
                variant="rectangle"
              />
              <div className="flex h-50 flex-col justify-center space-y-4 p-8 md:h-62.5">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !heroCards) return null;

  // 1221 颜色配置表
  const colorConfigs = [
    {
      // 配置 0: 浅色背景
      bgColor: "bg-[#e0e0e0]",
      titleColor: "text-black",
      subtitleColor: "text-black",
      buttonBg: "bg-gray-600",
      buttonText: "text-white",
      buttonHover: "hover:bg-black",
    },
    {
      // 配置 1: 深色背景
      bgColor: "bg-[#4a4a4a]",
      titleColor: "text-white",
      subtitleColor: "text-gray-200",
      buttonBg: "bg-gray-300",
      buttonText: "text-black",
      buttonHover: "hover:bg-white",
    },
  ];

  return (
    <section className="w-full scroll-smooth" style={navbarHeightStyle}>
      {/* 这里的 grid 负责左右分列 */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        {/* 显示所有后端返回的 hero-card */}
        {[{ type: "shop" }, ...heroCards].map((item, index) => {
          // 3. 修改：样式逻辑升级
          // 原逻辑: index 0,3 是浅色 -> A B B A
          // 新逻辑: 使用取模运算 (% 4) 让这个模式无限循环 -> A B B A A B B ...
          // 0(A), 1(B), 2(B), 3(A), 4(A), 5(B), 6(B)
          const remainder = index % 4;
          const config =
            colorConfigs[remainder === 0 || remainder === 3 ? 0 : 1];

          if ("type" in item && item.type === "shop") {
            return (
              <ContentBlock
                key="shop-block"
                {...config}
                description="Explore the latest series"
                isDesktop={isDesktop}
                navbarHeightStyle={navbarHeightStyle}
                title="NEW ARRIVALS"
              >
                <Shop />
              </ContentBlock>
            );
          }

          const card = item as HeroCardListRes[0];
          return (
            <ContentBlock
              key={card.id}
              {...config}
              buttonTextContent={card.buttonText}
              buttonUrl={card.buttonUrl}
              description={card.description}
              isDesktop={isDesktop}
              navbarHeightStyle={navbarHeightStyle}
              title={card.title}
            >
              <ImageComponent
                alt={card.title}
                // 核心：大屏才 fill，小屏不填满（依靠比例撑开高度）
                aspectRatio={isDesktop ? "h-full" : "aspect-auto"}
                // 小屏下不设死高度比例，让图片自然显示
                className="h-full w-full object-cover"
                containerClassName="w-full h-full"
                fill={isDesktop}
                imageId={card.mediaId}
                priority={index < 2}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </ContentBlock>
          );
        })}
      </div>
    </section>
  );
};
