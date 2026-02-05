/**
 * Next.js 中间件 - 站点解析
 *
 * 功能：
 * 1. 根据域名解析站点 ID
 * 2. 将站点信息注入到请求头中，供页面和服务使用
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeDomain } from "@/lib/site";

export async function middleware(request: NextRequest) {
  // 1. 获取域名
  const rawHost = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  const domain = normalizeDomain(rawHost);

  // 2. 兜底逻辑：本地开发环境使用环境变量
  const finalDomain =
    !domain || domain === "localhost" || domain === "127.0.0.1"
      ? normalizeDomain(process.env.DOMAIN || "")
      : domain;

  // 3. 创建响应并注入站点信息到请求头
  const response = NextResponse.next();

  // 将域名信息注入到请求头，供后续使用
  response.headers.set("x-site-domain", finalDomain);

  // 也可以将站点 ID 注入（如果需要从数据库查询）
  // 注意：中间件中不能直接使用 Edge Runtime 不兼容的数据库操作
  // 所以这里只传递域名，在页面组件中再查询站点信息

  return response;
}

// 配置中间件匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api 路由
     * - _next (Next.js 内部)
     * - 静态文件 (images, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
