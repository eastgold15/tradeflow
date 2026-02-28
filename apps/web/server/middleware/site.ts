import { HttpError } from "@pori15/logixlysia";
import Elysia from "elysia";
import { type db, dbPlugin } from "../db/connection";
import { siteCache } from "@/lib/cache/domain-cache";

/**
 * 站点中间件 - 根据域名查找站点ID并注入上下文
 * 支持缓存优化，减少数据库查询
 */
export const siteMiddleware = new Elysia({ name: "site-middleware" })
  .use(dbPlugin)
  .derive(async ({ db, request }) => {
    // 优先使用 proxy.ts 已经计算好的域名（从 x-site-domain 请求头）
    let domain = request.headers.get("x-site-domain") || "";

    // 如果 proxy.ts 没有传递（比如直接调用 API），则兜底处理
    if (!domain) {
      const rawHost = request.headers.get("host") || "";
      const normalize = (h: string) => h.split(":")[0].toLowerCase().replace(/^www\./, "");
      domain = normalize(rawHost);

      // 本地开发环境兜底
      if (!domain || domain === "localhost" || domain === "127.0.0.1") {
        domain = normalize(process.env.DOMAIN || "");
      }
    }

    if (!domain) {
      console.error("[CRITICAL] No domain found in x-site-domain header, Host header or DOMAIN env");
      throw new HttpError.NotFound("Domain configuration missing");
    }

    const site = await siteCache.getOrFetch(domain, () => getSite(domain, db));
    return { site };
  })
  .as("global");

/**
 * 从数据库查询站点信息
 */
async function getSite(domain: string, db: DBtype) {
  const res = await db.query.siteTable.findFirst({
    where: {
      domain
    }
  });

  if (!res) {
    console.error(`[SiteMiddleware] 数据库中找不到匹配的域名记录: "${domain}"`);
    throw new HttpError.NotFound(`[SiteMiddleware] 数据库中找不到匹配的域名记录: "${domain}"`);
  }

  return res;
}

export type Site = Awaited<ReturnType<typeof getSite>>;
export type DBtype = typeof db;

/**
 * 极简上下文：只需 siteId
 */
export interface ServiceContext {
  db: DBtype;
  site: Site;
}

/**
 * 清除站点缓存
 * 用于站点配置更新后刷新
 */
export function clearSiteCache(domain?: string): void {
  if (domain) {
    siteCache.delete(domain);
  } else {
    siteCache.clear();
  }
}
