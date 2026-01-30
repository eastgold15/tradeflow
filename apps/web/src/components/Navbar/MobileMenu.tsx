"use client";
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";
import { isExternalUrl } from "@/lib/utils";
import type { CategoryWithChildren } from "./DesktopMenu";
import { useNavAction } from "./hook/useNavAction";
import { NAV_STYLES, NavLink } from "./NavParts";

type MobileMenuProps = ComponentProps<"div"> & {
  categories: CategoryWithChildren[];
  onClose: () => void;
};

// 递归渲染移动端列表
const MobileCategoryItem = ({
  category,
  onClose,
  depth = 0,
}: {
  category: CategoryWithChildren;
  onClose: () => void;
  depth?: number;
}) => {
  const { getCategoryHref, handleNavigate } = useNavAction();
  // 如果有 url 则使用 url，否则使用分类链接
  const href = category.url || getCategoryHref(category.id);
  const hasChildren = category.children && category.children.length > 0;
  const isExternal = category.url ? isExternalUrl(category.url) : false;

  // 根据深度选择样式
  const linkClass = twMerge(
    depth === 0 ? NAV_STYLES.mobileLink : NAV_STYLES.mobileSubLink,
    depth > 0 && "pl-4 text-sm opacity-80" // 子级自动缩进
  );
  return (
    <div className={depth === 0 ? "border-gray-100 border-b" : ""}>
      {/* 有子分类的父级不可点击，只展示名称 */}
      {hasChildren ? (
        <span className={linkClass}>{category.name}</span>
      ) : // 如果是外部链接，使用原生 a 标签
      isExternal ? (
        <a
          className={linkClass}
          href={href}
          onClick={() => onClose()}
          rel="noopener noreferrer"
          target="_blank"
        >
          {category.name}
        </a>
      ) : (
        <NavLink
          className={linkClass}
          href={href}
          onClick={() => handleNavigate(href, onClose)}
        >
          {category.name}
        </NavLink>
      )}

      {/* 递归渲染子级 */}
      {hasChildren && (
        <div className="mb-2">
          {(category.children || []).map((child) => (
            <MobileCategoryItem
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

export const MobileMenu = ({
  categories,
  onClose,
  ...props
}: MobileMenuProps) => (
  <div className={twMerge("flex flex-col divide-gray-100", props.className)}>
    {categories.map((cat) => (
      <MobileCategoryItem category={cat} key={cat.id} onClose={onClose} />
    ))}
  </div>
);
