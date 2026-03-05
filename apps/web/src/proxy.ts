import { type NextRequest, NextResponse } from "next/server";
import { normalizeDomain } from "@/lib/site";

/**
 * Next.js Proxy - 统一处理站点解析与请求转发
 * 代替已废弃的 middleware.ts
 *
 * 职责：
 * 1. 解析域名并规范化
 * 2. 注入 x-site-domain 请求头，供：
 *    - Next.js Server Components 使用
 *    - Elysia siteMiddleware 复用（避免重复计算）
 */
export default function proxy(request: NextRequest) {
  // 1. 准备新的请求头（基于原始请求头）
  const requestHeaders = new Headers(request.headers);

  // 2. 站点解析逻辑 (Domain Handling) - 统一入口，避免重复计算
  const rawHost =
    request.headers.get("host") ||
    request.headers.get("x-forwarded-host") ||
    "";
  let domain = normalizeDomain(rawHost);

  // 3. 兜底逻辑：仅在本地开发环境使用环境变量
  const isLocalhost =
    !domain || domain === "localhost" || domain.includes("127.0.0.1");
  if (isLocalhost) {
    // 只在非生产环境使用 DOMAIN 环境变量
    const isDev =
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    if (isDev) {
      domain = normalizeDomain(process.env.DOMAIN || "default-domain.com");
    }
  }

  // 4. 注入域名信息到请求头，供后续使用：
  // - Next.js Server Components (generateMetadata, etc.)
  // - Elysia siteMiddleware (直接读取，避免重复计算)
  requestHeaders.set("x-site-domain", domain);

  // 5. 返回响应
  // 可以确保这些 headers 被传递给后续的 Server Components
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// 统一配置匹配规则
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next, _vercel (内部路由)
     * - 静态文件 (带有后缀名的文件，如 .jpg, .svg 等)
     *
     * 注意：现在也处理 /api/* 路由，为 Elysia siteMiddleware 注入 x-site-domain
     */
    "/((?!_next|_vercel|favicon.ico|.*\\..*$).*)",
  ],
};
