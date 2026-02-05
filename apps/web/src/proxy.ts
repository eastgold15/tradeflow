import { type NextRequest, NextResponse } from "next/server";
import { normalizeDomain } from "@/lib/site";
import { SERVER_URL_KEY } from "./lib/utils/constants";

/**
 * Next.js Proxy - 统一处理站点解析与请求转发
 * 代替已废弃的 middleware.ts
 */
export default function proxy(request: NextRequest) {
  // 1. 准备新的请求头（基于原始请求头）
  const requestHeaders = new Headers(request.headers);

  // 2. 处理 URL 注入 (SERVER_URL_KEY)
  requestHeaders.set(SERVER_URL_KEY, request.url);

  // 3. 站点解析逻辑 (Domain Handling)
  const rawHost = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  const domain = normalizeDomain(rawHost);

  // 兜底逻辑：本地开发环境处理
  const finalDomain =
    !domain || domain.includes("localhost") || domain.includes("127.0.0.1")
      ? normalizeDomain(process.env.DOMAIN || "default-domain.com")
      : domain;

  // 注入域名信息到请求头，供服务器组件中的 generateMetadata 或其他 Service 调用
  requestHeaders.set("x-site-domain", finalDomain);

  // 4. 返回响应
  // 注意：在 Next.js 16 中，通过 NextResponse.next({ request: { headers: ... } }) 
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
     * - api 路由
     * - _next, _vercel (内部路由)
     * - 静态文件 (带有后缀名的文件，如 .jpg, .svg 等)
     */
    "/((?!api|_next|_vercel|favicon.ico|.*\\..*$).*)",
  ],
};