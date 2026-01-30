import { HttpError } from "@pori15/elysia-unified-error";
import Elysia from "elysia";
import { type db, dbPlugin } from "../db/connection";

/**
 * 站点中间件 - 根据域名查找站点ID并注入上下文
 */
export const siteMiddleware = new Elysia({ name: "site-middleware" })
  .use(dbPlugin)
  .derive(async ({ db, request }) => {
    // 从请求头获取域名
    const hostname = request.headers.get("host") || "localhost";
    console.log("hostname:", hostname);

    // 移除端口号（如果存在）
    const domain = hostname.split(":")[0];
    console.log("domain:", domain);

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
  const res = await db.query.siteTable.findFirst({
    where: {
      domain,
    },
  });
  if (!res) {
    throw new HttpError.NotFound(`Site not found for domain: ${domain}`);
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
