import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // 匹配所有以 /contact 结尾的路径
  // 例如: /xxx/contact, /single/contact, /abc/def/contact
  if (url.pathname.endsWith("/contact")) {
    // 重定向到根路径的 /contact
    const redirectUrl = new URL("/contact", request.url);
    return NextResponse.redirect(redirectUrl, 308); // 308 表示永久重定向，保留 POST 请求方法
  }

  return NextResponse.next();
}

// 配置 middleware 匹配的路径
export const config = {
  matcher: [
    // 匹配所有路径，除了 Next.js 内部路径和静态文件
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
