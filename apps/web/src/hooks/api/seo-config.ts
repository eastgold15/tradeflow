import { Treaty } from "@elysiajs/eden";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

// 1. Extract the request parameters type from the RPC method
type SeoConfigTableParams = Parameters<typeof rpc.seoconfig.get>[0];

// 2. Extract and clean the response data type
export type SeoConfigListRes = NonNullable<
  Treaty.Data<typeof rpc.seoconfig.get>
>;

export type SeoConfigItem = SeoConfigListRes[number]

export const seoConfigKeys = {
  all: ["seoconfig"] as const,
  lists: () => [...seoConfigKeys.all, "list"] as const,
  list: (params: any) => [...seoConfigKeys.lists(), params] as const,
  detail: (code: string) => [...seoConfigKeys.all, "detail", code] as const,
};

/**
 * 获取 SEO 配置列表
 * @param params - API 请求参数
 * @param enabled - 是否启用查询
 */
export function useSeoConfigList(query: SeoConfigTableParams, enabled = true) {
  return useQuery({
    queryKey: seoConfigKeys.list(query),
    queryFn: async () => {
      const response = await rpc.seoconfig.get(query);
      return response.data;
    },
    enabled: enabled && !!query,
  });
}

