import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...slugs]]/route";
import { env } from "@/env";
const isServer = typeof window === "undefined";

const getBaseURL = () => {
  if (!isServer) return window.location.origin;
  return `http://localhost:${env.PORT}`;
};

export const rpc = treaty<App>(getBaseURL(), {
  // 根据官方文档，这里可以直接传入 headers 对象
  // 如果是服务端渲染，我们强制把 host 改为数据库里存的主域名
  headers: isServer ? {
    host: env.DOMAIN,
  } : undefined,
}).api;