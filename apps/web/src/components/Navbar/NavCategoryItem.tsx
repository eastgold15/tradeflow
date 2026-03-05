"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { isExternalUrl } from "@/lib/utils";
import type { CategoryWithChildren } from "./DesktopMenu";
import { useNavAction } from "./hook/useNavAction";
import { NavLink } from "./NavParts";

interface NavItemProps {
  category: CategoryWithChildren;
  onClose?: () => void;
  depth?: number;
}

export const NavCategoryItem = ({
  category,
  onClose,
  depth = 0,
}: NavItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getCategoryHref, handleNavigate } = useNavAction();

  const hasChildren = category.children && category.children.length > 0;
  const href = category.url || getCategoryHref(category.slug || category.id);
  const isExternal = category.url ? isExternalUrl(category.url) : false;

  // 基础样式：根据深度和屏幕尺寸动态计算
  const linkBaseClass = twMerge(
    // 桌面端样式
    "md:px-4 md:py-2 md:text-xs md:uppercase md:tracking-widest md:hover:text-gray-500 lg:text-sm",
    // 移动端样式
    "flex w-full items-center justify-between border-gray-100 border-b py-4 text-base uppercase md:border-none",
    depth > 0 &&
      "pl-4 text-sm opacity-80 md:pl-2 md:normal-case md:tracking-normal md:opacity-100"
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
      onMouseEnter={() => {
        // 🔥 只有桌面端才启用悬停展开
        if (window.innerWidth > 768) {
          setIsOpen(true);
        }
      }}
      onMouseLeave={() => {
        // 🔥 只有桌面端才启用悬停关闭
        if (window.innerWidth > 768) {
          setIsOpen(false);
        }
      }}
    >
      {/* 链接/标题区域 */}
      <div className={linkBaseClass} onClick={toggle}>
        {isExternal ? (
          <a
            className="flex items-center"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
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
          <ChevronDown
            className={twMerge(
              "h-4 w-4 transition-transform duration-200",
              isOpen ? "rotate-180" : ""
            )}
          />
        )}
      </div>

      {/* 🔥 子菜单容器 - 桌面端使用 group-hover 控制，移动端使用 isOpen 控制 */}
      {hasChildren && isOpen && (
        <div
          className={twMerge(
            // 桌面端下拉浮层
            "md:absolute md:z-50 md:block md:min-w-50 md:bg-white md:shadow-lg",
            // 🔥 根据深度调整位置：一级在下方，二级及以上在右侧
            depth === 0 ? "md:top-full md:left-0" : "md:top-0 md:left-full",
            // 移动端折叠面板
            "bg-gray-50/50 md:bg-white"
          )}
        >
          {category.children!.map((child) => (
            <NavCategoryItem
              category={child}
              depth={depth + 1}
              key={child.id}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
};
