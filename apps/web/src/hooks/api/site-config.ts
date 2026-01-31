import { Treaty } from "@elysiajs/eden";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";

// 1. Extract the request parameters type from the RPC method
type SiteConfigParams = Parameters<(typeof rpc)["site-config"]["get"]>[0];

// 2. Extract and clean the response data type
export type SiteConfigListRes = NonNullable<
  Treaty.Data<(typeof rpc)["site-config"]["get"]>
>;
export const siteconfigKeys = {
  all: ["siteconfig"] as const,
  lists: () => [...siteconfigKeys.all, "list"] as const,
  list: (params: any) => [...siteconfigKeys.lists(), params] as const,
  details: () => [...siteconfigKeys.all, "detail"] as const,
  detail: (id: string) => [...siteconfigKeys.details(), id] as const,
};
/**
 * Custom hook to fetch Site Configuration list
 * @param params - API request parameters (query/path/body)
 * @param enabled - Manual toggle for the query (useful for dependent queries)
 */
export function useSiteConfigList(query: SiteConfigParams, enabled = true) {
  return useQuery({
    // Ensure the queryKey changes when params change to trigger a refetch
    queryKey: siteconfigKeys.list(query),
    queryFn: async () => {
      const response = await rpc["site-config"].get(query);
      // Depending on your RPC client, you might need to handle errors or return .data
      return response.data;
    },
    enabled: enabled && !!query,
    staleTime: Infinity, // 第一次请求后永久缓存
  });
}
