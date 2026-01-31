import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...slugs]]/route";
import { env } from "@/env";

const getBaseURL = () => {
  if (typeof window !== "undefined") return window.location.origin;
  // 服务端内部请求 127.0.0.1，绕过 DNS，解决 504/499 问题
  return `http://127.0.0.1:${process.env.PORT || 3000}`;
};

export const rpc = treaty<App>(getBaseURL(), {
  // 根据官方文档，这里可以直接传入 headers 对象
  // 如果是服务端渲染，我们强制把 host 改为数据库里存的主域名
  headers: typeof window === "undefined" ? {
    host: env.DOMAIN, // 这里设置 DOMAIN=DONGQIFOOTWEAR.com
  } : undefined,
}).api;