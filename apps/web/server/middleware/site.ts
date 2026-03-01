import { HttpError } from "@pori15/logixlysia";
import Elysia from "elysia";
import { type db, dbPlugin } from "../db/connection";
import { siteInfoCache } from "@/lib/cache/domain-cache";

/**
 * 规范化域名
 */
const normalizeDomain = (h: string) =>
  h.split(":")[0].toLowerCase().replace(/^www\./, "");

/**
 * 站点中间件 - 根据域名查找站点ID并注入上下文
 * 支持缓存优化，减少数据库查询
 *
 * 多域名场景：
 * 1. 优先从 x-site-domain 请求头获取（由前端 proxy.ts 设置）
 * 2. 兜底从 host 请求头获取（直接 API 调用场景）
 * 3. 生产环境必须通过域名匹配，不使用环境变量
 */
export const siteMiddleware = new Elysia({ name: "site-middleware" })
  .use(dbPlugin)
  .derive(async ({ db, request }) => {
    // 1. 优先使用 proxy.ts 设置的域名
    let domain = request.headers.get("x-site-domain") || "";

    // 2. 如果没有 x-site-domain，尝试从 host 获取（直接 API 调用场景）
    if (!domain) {
      const rawHost = request.headers.get("host") || "";
      domain = normalizeDomain(rawHost);
    }

    // 3. 本地开发环境兜底（只用于本地开发）
    const isLocalhost = domain === "localhost" || domain === "127.0.0.1" || !domain;
    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    if (isLocalhost && isDev) {
      domain = normalizeDomain(process.env.DOMAIN || "");
      if (isDev) {
        console.log(`[SiteMiddleware] Localhost detected, using DOMAIN from env: "${domain}"`);
      }
    }

    if (!domain) {
      console.error("[SiteMiddleware] No domain found in request");
      throw new HttpError.NotFound("Domain configuration missing");
    }

    const site = await siteInfoCache.getOrFetch(domain, () => getSite(domain, db));
    return { site, domain };
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
    siteInfoCache.delete(domain);
  } else {
    siteInfoCache.deleteByPrefix("");
  }
}
