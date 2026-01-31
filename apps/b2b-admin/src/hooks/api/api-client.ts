// lib/api-client.ts
import { env } from "@/env";
import { useAuthStore } from "@/stores/auth-store";

// 1. 定义 RequestOptions，区分 Body 和 Query
// TBody: 请求体类型 (POST/PUT 用)
// TQuery: 查询参数类型 (GET列表筛选用)
type RequestOptions<
  TBody = undefined,
  TQuery = Record<string, string | number>,
> = Omit<RequestInit, "body"> & {
  params?: TQuery; // 这里现在是强类型的
  body?: TBody;
  token?: string;
};

// 2. 核心 request 函数
async function request<
  TRes,
  TBody = undefined,
  TQuery = Record<string, string | number>,
>(
  endpoint: string,
  { params, body, token, ...options }: RequestOptions<TBody, TQuery> = {}
): Promise<TRes> {
  const BASE_URL = env.NEXT_PUBLIC_API_URL || "";
  const url = new URL(
    endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`
  );

  // 处理 Query Params
  if (params) {
    Object.entries(params as Record<string, any>).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.append(k, String(v));
      }
    });
  }

  const headers = new Headers(options.headers);

  // 🔥 检查是否是 FormData，FormData 不需要设置 Content-Type
  const isFormData = body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  // 🔥 动态获取 currentDeptId，确保每次请求都使用最新值
  const currentDeptId = useAuthStore.getState().currentDeptId;
  if (currentDeptId) {
    headers.set("x-current-dept-id", currentDeptId);
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers,
    credentials: "include", // 🔥 关键：允许发送和接收 cookie
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // 尝试解析后端传回的 Problem Details JSON
    const errorPayload = await response.json().catch(() => ({}));

    console.log("❌ [api-client] 请求失败, response.status:", response.status);
    console.log("❌ [api-client] errorPayload:", errorPayload);

    // 🚨 重点：不要包装成 new Error(message)，而是直接把 RFC 对象 reject 掉
    // 这样在 QueryProvider 里的 onError(error) 拿到的就是完整的对象了
    const rejectionError = {
      ...errorPayload,
      // 兜底：如果后端没传 status 或 title，用 HTTP 响应补全
      status: errorPayload.status || response.status,
      title: errorPayload.title || response.statusText,
    };

    console.log("❌ [api-client] 准备 reject:", rejectionError);
    return Promise.reject(rejectionError);
  }

  return response.json() as Promise<TRes>;
}

// 3. 导出增强后的快捷方法
export const api = {
  // GET: 接收 <返回类型, 查询参数类型>
  // TBody 设为 never，防止你在 GET 里传 body
  get: <TRes, TQuery = Record<string, string | number>>(
    url: string,
    opts?: RequestOptions<never, TQuery>
  ) => request<TRes, never, TQuery>(url, { ...opts, method: "GET" }),

  // POST: 接收 <返回类型, 请求体类型>
  // POST 通常不需要复杂的 Query Param，如果有特殊需求也可以扩展
  post: <TRes, TBody>(url: string, body: TBody, opts?: RequestOptions<TBody>) =>
    request<TRes, TBody>(url, { ...opts, method: "POST", body }),

  // PUT: 接收 <返回类型, 请求体类型>
  put: <TRes, TBody>(url: string, body: TBody, opts?: RequestOptions<TBody>) =>
    request<TRes, TBody>(url, { ...opts, method: "PUT", body }),

  // DELETE: 支持 body（用于批量删除）和 query
  delete: <TRes, TBody = undefined>(
    url: string,
    body?: TBody,
    opts?: RequestOptions<TBody>
  ) => request<TRes, TBody>(url, { ...opts, method: "DELETE", body }),

  // PATCH: 支持 body（用于部分更新）
  patch: <TRes, TBody>(
    url: string,
    body: TBody,
    opts?: RequestOptions<TBody>
  ) => request<TRes, TBody>(url, { ...opts, method: "PATCH", body }),
};
