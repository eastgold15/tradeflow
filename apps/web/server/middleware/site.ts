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
    // 1. 统一转小写并去掉端口
    let domain = hostname.split(":")[0].toLowerCase();

    // 2. 关键：如果是 www 开头，去掉它
    // 这样 www.dongqifootwear.com 就会变成 dongqifootwear.com
    if (domain.startsWith("www.")) {
      domain = domain.replace(/^www\./, "");
    }

    // 3. 查数据库。此时 domain 已经是干净的 "dongqifootwear.com"
    const site = await getSite(domain, db);

    if (!site) {
      console.error(`[SiteMiddleware] Domain mismatch: ${domain}`);
      throw new HttpError.NotFound(`Site not found`);
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
