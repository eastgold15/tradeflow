import { treaty } from "@elysiajs/eden";
// 1. 关键：只使用 import type
import type { App } from "@/app/api/[[...slugs]]/route";
import { env } from "@/env";

// 2. 区分环境
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    // 浏览器环境：使用相对路径或配置好的环境变量
    return window.location.origin;
  }
  // 服务端环境
  return `http://${env.DOMAIN}`;
};

// 3. 传入类型参数 <App>，但不传入 app 实例
export const rpc = treaty<App>(getBaseURL()).api;
