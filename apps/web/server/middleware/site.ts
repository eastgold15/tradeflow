import { HttpError } from "@pori15/logixlysia";
import Elysia from "elysia";
import { type db, dbPlugin } from "../db/connection";

/**
 * 站点中间件 - 根据域名查找站点ID并注入上下文
 */
export const siteMiddleware = new Elysia({ name: "site-middleware" })
  .use(dbPlugin)
  .derive(async ({ db, request }) => {
    const hostname = request.headers.get("host") || "";
    // 移除端口
    const domain = hostname.split(":")[0];

    // --- 修复点 1: 处理服务端内部调用 ---
    // 如果是服务器内部请求，可能需要通过 Header 传递原始域名，或者设置默认值
    if (domain === "localhost" || domain === "127.0.0.1") {
      // 在生产环境 SSR 时，你可能需要从配置或 x-forwarded-host 中取值
      const realHost = request.headers.get("x-forwarded-host") || process.env.DOMAIN;
      if (realHost) return { site: await getSite(realHost.split(":")[0], db) };
    }


    // 查找对应的站点
    const site = await getSite(domain, db);
    console.log("site:", site);

    if (!site) {
      throw new HttpError.NotFound(`Site not found for domain: ${domain}`);
    }

    if (!site.isActive) {
      throw new HttpError.Forbidden(`Site is not active: ${domain}`);
    }

    return {
      site,
    };
  })
  .as("global");

async function getSite(domain: string, db: DBtype) {
  let res = await db.query.siteTable.findFirst({
    where: {
      domain,
    },
  });
  // 如果你是希望三级域名共享二级域名的配置
  if (!res && domain.split('.').length > 2) {
    const mainDomain = domain.split('.').slice(-2).join('.'); // 取 brand.com
    res = await db.query.siteTable.findFirst({
      where: {
        domain: mainDomain,
      }
    });
  }

  if (!res) {
    console.error(`[SiteMiddleware] 未找到域名映射: ${domain}`);
    throw new HttpError.NotFound(`Site not found`);
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
