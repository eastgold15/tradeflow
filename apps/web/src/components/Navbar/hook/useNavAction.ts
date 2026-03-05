"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export const useNavAction = () => {
  const router = useRouter();

  /**
   * 生成标准分类路径（使用 slug）
   * 移除 slug 中可能存在的前导斜杠，避免双斜杠问题
   */
  const getCategoryHref = useCallback((slug: string) => {
    // 移除前导斜杠，防止产生双斜杠
    const cleanSlug = slug.startsWith("/") ? slug.substring(1) : slug;
    return `/category/${cleanSlug}`;
  }, []);

  /**
   * 处理导航动作（包含副作用：滚动、关闭菜单）
   */
  const handleNavigate = useCallback(
    (href: string, callback?: () => void) => {
      // 执行回调（如关闭移动端菜单）
      if (callback) callback();

      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: "smooth" });

      // 这里的 router.push 其实对于 <Link> 组件是可选的，
      // 但为了确保 onClick 里的逻辑执行，保留它作为备选或编程式导航
      // router.push(href);
    },
    [] // 移除 router 依赖，因为我们主要依赖 <Link> 的原生跳转
  );

  return { getCategoryHref, handleNavigate };
};
