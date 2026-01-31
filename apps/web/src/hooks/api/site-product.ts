"use client";
import type { Treaty } from "@elysiajs/eden";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { rpc } from "@/lib/rpc";

const peoductDetail = async (id: string) => {
  return await rpc.site_products({ id }).get();
};
export type ProductDetailRes = NonNullable<Treaty.Data<typeof peoductDetail>>;

/**
 * 获取单个商品详情
 */
export function useProductDetail(id: string) {
  return useQuery({
    queryKey: ["site_product", id],
    queryFn: async () => {
      if (!id) throw new Error("Product ID is required");
      const { data, error } = await peoductDetail(id);
      if (error) {
        toast.error(error.value?.message || "获取商品详情失败");
      }
      return data! as unknown as ProductDetailRes;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    retry: 2,
  });
}
