"use client";

import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChevronDown, ExternalLink } from "lucide-react";
import { NavLink, NAV_STYLES } from "./NavParts";
import { useNavAction } from "./hook/useNavAction";
import { isExternalUrl } from "@/lib/utils";
import type { CategoryWithChildren } from "./DesktopMenu";

interface NavItemProps {
  category: CategoryWithChildren;
  onClose?: () => void;
  depth?: number;
}

export const NavCategoryItem = ({ category, onClose, depth = 0 }: NavItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getCategoryHref, handleNavigate } = useNavAction();

  const hasChildren = category.children && category.children.length > 0;
  const href = category.url || getCategoryHref(category.id);
  const isExternal = category.url ? isExternalUrl(category.url) : false;

  // 基础样式：根据深度和屏幕尺寸动态计算
  const linkBaseClass = twMerge(
    // 桌面端样式
    "md:px-4 md:py-2 md:text-xs lg:text-sm md:uppercase md:tracking-widest md:hover:text-gray-500",
    // 移动端样式
    "flex w-full items-center justify-between py-4 text-base uppercase border-b border-gray-100 md:border-none",
    depth > 0 && "pl-4 text-sm opacity-80 md:pl-2 md:opacity-100 md:normal-case md:tracking-normal"
  );

  const toggle = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div
      className={twMerge(
        "group relative",
        depth === 0 ? "md:h-full" : "w-full"
      )}
      onMouseEnter={() => window.innerWidth > 768 && setIsOpen(true)}
      onMouseLeave={() => window.innerWidth > 768 && setIsOpen(false)}
    >
      {/* 链接/标题区域 */}
      <div className={linkBaseClass} onClick={toggle}>
        {isExternal ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center">
            {category.name} <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
          </a>
        ) : hasChildren ? (
          <span className="cursor-pointer">{category.name}</span>
        ) : (
          <NavLink href={href} onClick={() => handleNavigate(href, onClose)}>
            {category.name}
          </NavLink>
        )}

        {/* 下拉箭头 - 移动端点击，桌面端可选 */}
        {hasChildren && (
          <ChevronDown className={twMerge(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-180" : ""
          )} />
        )}
      </div>

      {/* 子菜单容器 */}
      {hasChildren && (
        <div className={twMerge(
          // 桌面端下拉浮层
          "md:invisible md:absolute md:top-full md:left-0 md:z-50 md:min-w-[200px] md:bg-white md:shadow-lg md:group-hover:visible md:animate-in md:fade-in md:zoom-in-95",
          // 移动端折叠面板
          isOpen ? "block" : "hidden md:block",
          "bg-gray-50/50 md:bg-white"
        )}>
          {category.children!.map((child) => (
            <NavCategoryItem
              key={child.id}
              category={child}
              depth={depth + 1}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
};