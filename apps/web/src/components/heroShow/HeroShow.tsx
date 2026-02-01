"use client";
import Link from "next/link";
import type React from "react";
import { ImageComponent } from "@/components/common/Image";
import {
  type HeroCardListRes,
  useCurrentHeroCardsList,
} from "@/hooks/api/hero-cards-hook";
import { cn } from "@/lib/utils";
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
}) => (
  <div className={`flex flex-col ${bgColor}`}>
    {/* 上部：根据传入的children渲染 */}
      <div className="relative h-[60vh] min-h-0 w-full grow md:h-[calc(100vh-var(--navbar-height))]">
      {children}
    </div>

    {/* 下部：文字内容 - 固定高度 */}
    {title || description || buttonUrl ? (
      <div className="flex min-h-42.5 flex-col justify-center p-8">
        {title && (
          <h3
            className={`mb-4 font-serif text-2xl italic md:text-3xl ${titleColor}`}
          >
            {title}
          </h3>
        )}
        <div className="flex items-center justify-between gap-4">
          {description && (
            <p className={`text-sm tracking-wide ${subtitleColor}`}>
              {description}
            </p>
          )}
          {buttonUrl && (
            <Link href={buttonUrl}>
              <button
                className={`shrink-0 px-8 py-3 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors ${buttonBg} ${buttonText} ${buttonHover}`}
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

  // 1. 修改：骨架屏数量增加到 7 个
  if (isLoading) {
    return (
      <section className="min-h-screen w-full">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="flex flex-col" key={i}>
            <Skeleton className="h-[60vh] md:h-150" variant="rectangle" />
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
    <section className={cn("w-full")}>
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
              title={card.title}
            >
              <ImageComponent
                alt={card.title}
                className="absolute inset-0 h-full w-full transform bg-white object-cover transition-transform duration-700 group-hover:scale-105"
                imageId={card.mediaId}
              />
            </ContentBlock>
          );
        })}
      </div>
    </section>
  );
};
