import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...slugs]]/route";
import { env } from "@/env";

const isServer = typeof window === "undefined";

const getBaseURL = () => {
  if (!isServer) return window.location.origin;
  return `http://localhost:${env.PORT}`;
};

/**
 * 动态获取服务端请求头
 *
 * 为什么使用动态导入：
 * 1. next/headers 只能在服务端使用，不能直接 import（会破坏客户端构建）
 * 2. 使用 await import() 确保只在服务端执行时才加载模块
 * 3. Next.js 16+ 的 headers() 是异步的，需要 await
 */
async function getServerHeaders(): Promise<Record<string, string> | undefined> {
  if (!isServer) return undefined;

  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();

    // 优先使用 proxy.ts 设置的 x-site-domain
    let domain = headersList.get("x-site-domain");

    // 如果没有 x-site-domain，从 host 获取并标准化
    if (!domain) {
      const host = headersList.get("host") || "";
      domain = host.replace(/^www\./, "").split(":")[0];
    }

    // 开发环境兜底
    if (!domain || domain === "localhost" || domain === "127.0.0.1") {
      domain = process.env.DOMAIN || "dongqishoes.com";
    }

    console.log("[rpc] Server component requesting with domain:", domain);

    if (domain) {
      return { "x-site-domain": domain };
    }
  } catch (error) {
    console.error("[rpc] Error getting server headers:", error);
  }

  return undefined;
}

/**
 * RPC 客户端配置
 *
 * 工作原理：
 * - 客户端：浏览器自动发送 host 请求头，后端从 host 获取域名
 * - 服务端：通过 onRequest hook 添加 x-site-domain 请求头
 */
export const rpc = treaty<App>(getBaseURL(), {
  onRequest: isServer
    ? async (path, options) => {
        const extra = await getServerHeaders();
        if (extra) {
          return {
            ...options,
            headers: { ...options.headers, ...extra },
          };
        }
        return options;
      }
    : undefined,
}).api;
