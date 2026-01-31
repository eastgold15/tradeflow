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
    let domain = hostname.split(":")[0].toLowerCase(); // 转小写防错

    // 1. 处理服务端 SSR 内部调用
    if (domain === "localhost" || domain === "127.0.0.1") {
      // 优先取透传的 Host，取不到说明是 SSR 发起的，使用环境变量里的主域名
      const forwardedHost = request.headers.get("x-forwarded-host");
      domain = forwardedHost ? forwardedHost.split(":")[0] : process.env.DOMAIN || "";
    }

    // 2. 核心逻辑：如果是 www.dongqifootwear.com，剥离 www.
    // 这样 www 和 不带 www 最终都会去查数据库里的 "dongqifootwear.com"
    if (domain.startsWith("www.")) {
      domain = domain.replace(/^www\./, "");
    }

    console.log(`[SiteMiddleware] Final matching domain: ${domain}`);

    const site = await getSite(domain, db);

    if (!site) {
      throw new HttpError.NotFound(`Site not found for domain: ${domain}`);
    }

    return { site };
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
