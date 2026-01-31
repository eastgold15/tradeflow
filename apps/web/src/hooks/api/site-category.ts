import type { Treaty } from "@elysiajs/eden";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/query-keys";
import { rpc } from "@/lib/rpc";
import {
  SiteCategoryDetailRes,
  SiteCategoryProductRes,
  SiteProductListRes,
} from "./site-category.type";

// 类型定义

export type SiteCategoryListRes = NonNullable<
  Treaty.Data<typeof rpc.site_category.get>
>;

// 获取站点分类目录列表（支持分页）
export function useSiteCategoryList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: async () => {
      const { data, error } = await rpc.site_category.get();
      if (error) {
        toast.error((error.value as any)?.message || "获取分类目录失败");
      }
      return data! as SiteCategoryListRes;
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}

// 获取分类目录详情
export function useSiteCategoryDetail(
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.categories.desc(id),
    queryFn: async () => {
      const { data, error } = await rpc.site_category.detail({ id }).get();
      if (error) {
        toast.error(error.value?.message || "获取分类目录详情失败");
      }
      return data! as unknown as SiteCategoryDetailRes;
    },
    enabled: options?.enabled ?? !!id,
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// 获取分类目录下的商品列表（支持分页）
export function useSiteCategoryProducts(
  id: string,
  params: { page: number; limit: number } = { page: 1, limit: 10 },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["category-products", id, params],
    queryFn: async () => {
      console.log("Fetching category products:", id, params);
      const { data, error } = await rpc.site_category
        .category({ id })
        .get({ query: params });

      console.log("Category products response:", { data, error });
      if (error) {
        console.error("Error fetching category products:", error);
        toast.error(error.value?.message || "获取分类商品失败");
      }
      return data! as unknown as SiteCategoryProductRes[];
    },
    enabled: options?.enabled ?? !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnMount: "always", // 确保每次挂载时重新获取数据
    refetchOnWindowFocus: false,
  });
}

// 获取站点商品列表（支持搜索和分页）
export function useSiteProductList(
  params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["site-products", params],
    queryFn: async () => {
      // 过滤掉 undefined 的参数
      const cleanParams = Object.fromEntries(
        Object.entries({
          page: 1,
          limit: 10,
          ...params,
        }).filter(([_, v]) => v !== undefined)
      );

      const { data, error } = await rpc.site_products.get({
        query: cleanParams as any,
      });

      if (error) {
        toast.error(error.value?.message || "获取商品列表失败");
      }
      return data! as SiteProductListRes;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}
