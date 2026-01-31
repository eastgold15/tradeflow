"use client"; // 🔴 必须在第一行

import {
  isServer,
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { MasterCategoriesProvider } from "@/providers/master-categories-provider";
import { SiteCategoryProvider } from "@/providers/site-category-provider";
import { UserProvider } from "@/providers/UserProvider";

/**
 * 定义 RFC 9457 错误结构
 */
interface ProblemDetails {
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: any;
}

/**
 * 统一错误处理函数
 */
const handleGlobalError = (error: any) => {
  console.log("🔥 [Providers] 捕获到错误:", error);

  let errorMessage = "发生未知错误";
  let errorTitle = "请求失败";

  // api-client.ts 返回的直接结构: { title, status, detail, ... }
  const problem = error?.error || error?.response?.data || error;

  console.log("🔍 解析后的 problem:", problem);

  if (problem && typeof problem === "object" && "title" in problem) {
    const p = problem as ProblemDetails;
    errorTitle = p.title;
    errorMessage = p.detail || p.title;

    console.log("✅ 提取错误信息:", { errorTitle, errorMessage });

    if (p["x-pg-code"] === "23503") {
      console.warn("数据库外键约束冲突:", p["x-constraint"]);
    }
  } else {
    errorMessage = error instanceof Error ? error.message : String(error);
    console.log("⚠️ 使用兜底逻辑:", errorMessage);
  }

  console.log("📢 准备显示 toast:", { errorTitle, errorMessage });

  // 直接调用 toast
  toast.error(errorTitle, {
    description: errorMessage,
    duration: 4000,
  });

  console.error(`[Global API Error] ${errorTitle}:`, problem);
};

// 这里的函数用于创建 QueryClient
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 在服务端渲染期间，通常将 staleTime 设置为大于 0
        // 以避免在初始渲染后立即在客户端重新获取数据
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
    // 处理 GET 请求错误
    queryCache: new QueryCache({
      onError: (error) => handleGlobalError(error),
    }),
    // 处理 POST/PUT/DELETE 请求错误
    mutationCache: new MutationCache({
      onError: (error) => handleGlobalError(error),
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    // Server: 总是创建一个新的 QueryClient
    return makeQueryClient();
  }
  // Browser: 创建一个全新的 QueryClient (如果是首次)
  // 否则复用已有的 client，防止 React Suspense 导致的重新创建
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  // 🔴 关键修复：使用单例模式获取 client
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MasterCategoriesProvider>
        <SiteCategoryProvider>
          <UserProvider>{children}</UserProvider>
        </SiteCategoryProvider>
      </MasterCategoriesProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
