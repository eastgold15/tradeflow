// UnifiedMenu.tsx

import { twMerge } from "tailwind-merge";
import { SiteCategoryListRes } from "@/hooks/api/site-category";
import { NavCategoryItem } from "./NavCategoryItem";

interface UnifiedMenuProps {
  categories: SiteCategoryListRes;
  onClose?: () => void;
  variant: "desktop" | "mobile";
}

export const UnifiedMenu = ({
  categories,
  onClose,
  variant,
}: UnifiedMenuProps) => {
  // 过滤一级分类
  const topLevelCategories = categories.filter((cat) => !cat.parentId);

  return (
    <div
      className={twMerge(
        "flex",
        variant === "desktop"
          ? "hidden flex-row items-center justify-center space-x-6 md:flex lg:space-x-10"
          : "w-full flex-col"
      )}
    >
      {topLevelCategories.map((cat) => (
        <NavCategoryItem category={cat as any} key={cat.id} onClose={onClose} />
      ))}
    </div>
  );
};
