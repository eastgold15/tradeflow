// UnifiedMenu.tsx
import { SiteCategoryListRes } from "@/hooks/api/site-category";
import { NavCategoryItem } from './NavCategoryItem'
import { twMerge } from "tailwind-merge";

interface UnifiedMenuProps {
  categories: SiteCategoryListRes;
  onClose?: () => void;
  variant: "desktop" | "mobile";
}

export const UnifiedMenu = ({ categories, onClose, variant }: UnifiedMenuProps) => {
  // 过滤一级分类
  const topLevelCategories = categories.filter(
    (cat) => !cat.parentId
  );

  return (
    <div className={twMerge(
      "flex",
      variant === "desktop"
        ? "hidden md:flex flex-row items-center justify-center space-x-6 lg:space-x-10"
        : "flex-col w-full"
    )}>
      {topLevelCategories.map((cat) => (
        <NavCategoryItem
          key={cat.id}
          category={cat as any}
          onClose={onClose}
        />
      ))}
    </div>
  );
};