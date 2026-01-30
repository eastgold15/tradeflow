"use client";
import { useRef, useState } from "react";
import type { SiteCategoryListRes } from "@/hooks/api/site-category";
import { isExternalUrl } from "@/lib/utils";
import { useNavAction } from "./hook/useNavAction";
import { DropdownIndicator, NAV_STYLES, NavLink } from "./NavParts";

export type CategoryWithChildren = Omit<
  SiteCategoryListRes[number],
  "children"
> & {
  children?: CategoryWithChildren[];
  url?: string | null; // 添加 url 字段，匹配数据库返回类型
};

// 单个菜单项组件（递归核心）
const MenuItem = ({ category }: { category: CategoryWithChildren }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { getCategoryHref, handleNavigate } = useNavAction();

  const hasChildren = category.children && category.children.length > 0;
  // 如果有 url 则使用 url，否则使用分类链接
  const href = category.url || getCategoryHref(category.id);
  const isExternal = category.url ? isExternalUrl(category.url) : false;

  // 鼠标交互逻辑优化
  const onMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const onMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  // 无子分类的情况
  if (!hasChildren) {
    // 如果是外部链接，使用原生 a 标签
    if (isExternal) {
      return (
        <a
          className={NAV_STYLES.desktopLink}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {category.name}
        </a>
      );
    }
    return (
      <NavLink
        className={NAV_STYLES.desktopLink}
        href={href}
        onClick={() => handleNavigate(href)}
      >
        {category.name}
      </NavLink>
    );
  }

  // 有子分类的情况 - 父级不可点击
  return (
    <div
      className="relative flex h-full cursor-pointer items-center"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 父级菜单标题 - 不使用链接，只是视觉展示 */}
      <span className={NAV_STYLES.desktopLink}>
        {category.name}
        <DropdownIndicator isOpen={isOpen} />
      </span>

      {/* 递归下拉面板 */}
      {isOpen && (
        <div className="fade-in zoom-in-95 absolute top-full left-0 z-50 min-w-50 animate-in border border-gray-100 bg-white py-2 shadow-lg duration-100">
          {(category?.children || []).map((child) => (
            <DropdownItem category={child} key={child.id} />
          ))}
        </div>
      )}
    </div>
  );
};

// 下拉菜单项（显示子分类）
const DropdownItem = ({ category }: { category: CategoryWithChildren }) => {
  const { getCategoryHref, handleNavigate } = useNavAction();
  // 如果有 url 则使用 url，否则使用分类链接
  const href = category.url || getCategoryHref(category.id);
  const isExternal = category.url ? isExternalUrl(category.url) : false;

  // 如果是外部链接，使用原生 a 标签
  if (isExternal) {
    return (
      <a
        className={NAV_STYLES.dropdownItem}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {category.name}
      </a>
    );
  }

  return (
    <NavLink
      className={NAV_STYLES.dropdownItem}
      href={href}
      onClick={() => handleNavigate(href)}
    >
      {category.name}
    </NavLink>
  );
};

export const DesktopMenu = ({
  categories,
}: {
  categories: SiteCategoryListRes;
}) => {
  // 过滤出一级分类（parentId为null的分类）
  const topLevelCategories = categories.filter(
    (cat) => cat.parentId === null || cat.parentId === undefined
  );

  return (
    <div className="hidden items-center justify-center space-x-8 md:flex lg:space-x-12">
      {topLevelCategories.map((cat) => (
        <MenuItem category={cat as CategoryWithChildren} key={cat.id} />
      ))}
    </div>
  );
};
