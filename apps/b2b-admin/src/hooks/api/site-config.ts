/**
 * 🤖 【Frontend Hooks - 自动生成】
 * --------------------------------------------------------
 * ⚠️ 请勿手动修改此文件，下次运行会被覆盖。
 * 💡 如需自定义，请在 hooks/api 目录下新建文件进行封装。
 * --------------------------------------------------------
 */

import { SiteConfigContract } from "@repo/contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";
import { SiteConfigRes } from "./site-config.type";

// --- Query Keys ---
export const siteconfigKeys = {
  all: ["siteconfig"] as const,
  lists: () => [...siteconfigKeys.all, "list"] as const,
  list: (params: any) => [...siteconfigKeys.lists(), params] as const,
  details: () => [...siteconfigKeys.all, "detail"] as const,
  detail: (id: string) => [...siteconfigKeys.details(), id] as const,
};

// --- 1. 列表查询 (GET) ---
// TRes = any, TQuery = typeof SiteConfigContract.ListQuery.static
export function useSiteConfigList(
  params?: typeof SiteConfigContract.ListQuery.static,
  enabled = true
) {
  return useQuery({
    queryKey: siteconfigKeys.list(params),
    queryFn: () =>
      api.get<SiteConfigRes[], typeof SiteConfigContract.ListQuery.static>(
        "/api/v1/site-config",
        { params }
      ),
    enabled,
  });
}

// --- 2. 单个详情 (GET) ---
// TRes = any
export function useSiteConfigDetail(id: string, enabled = !!id) {
  return useQuery({
    queryKey: siteconfigKeys.detail(id),
    queryFn: () => api.get<any>(`/api/v1/site-config/${id}`),
    enabled,
  });
}

// --- 3. 创建 (POST) ---
// TRes = any, TBody = typeof SiteConfigContract.Create.static
export function useCreateSiteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: typeof SiteConfigContract.Create.static) =>
      api.post<any, typeof SiteConfigContract.Create.static>(
        "/api/v1/site-config",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteconfigKeys.lists() });
    },
  });
}

// --- 4. 更新 (PUT) ---
// TRes = any, TBody = typeof SiteConfigContract.Update.static
export function useUpdateSiteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: typeof SiteConfigContract.Update.static;
    }) =>
      api.put<any, typeof SiteConfigContract.Update.static>(
        `/api/v1/site-config/${id}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: siteconfigKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: siteconfigKeys.detail(variables.id),
      });
    },
  });
}

// --- 5. 删除 (DELETE) ---
// TRes = any
export function useDeleteSiteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<any>(`/api/v1/site-config/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteconfigKeys.lists() });
    },
  });
}

// --- 6. 获取配置键列表 (GET) ---
// TRes = typeof SiteConfigContract.KeysResponse.static
export function useSiteConfigKeys(enabled = true) {
  return useQuery({
    queryKey: [...siteconfigKeys.all, "keys"],
    queryFn: () =>
      api.get<typeof SiteConfigContract.KeysResponse.static>(
        "/api/v1/site-config/keys"
      ),
    enabled,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}
