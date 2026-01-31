import { HttpError } from "@pori15/logixlysia";
import Elysia from "elysia";
import { type db, dbPlugin } from "../db/connection";

/**
 * 站点中间件 - 根据域名查找站点ID并注入上下文
 */
export const siteMiddleware = new Elysia({ name: "site-middleware" })
  .use(dbPlugin)
  .derive(async ({ db, request }) => {
    // 1. 获取原始 host (例如 "localhost:8001")
    const rawHost = request.headers.get("host") || "";

    // 2. 统一处理函数：剥离端口、转小写、去 www
    const normalize = (h: string) => h.split(":")[0].toLowerCase().replace(/^www\./, "");

    let domain = normalize(rawHost);

    // 3. 兜底逻辑：如果是本地地址或为空，强行使用 DOMAIN 环境变量
    if (!domain || domain === "localhost" || domain === "127.0.0.1") {
      // 关键：对环境变量也要做一次 normalize，防止环境变量里误写了端口或大写
      domain = normalize(process.env.DOMAIN || "");
    }

    // 4. 最后的防御：如果还是没拿到（环境变量也没配），报错
    if (!domain) {
      console.error("[CRITICAL] No domain found in Host header or DOMAIN env");
      throw new HttpError.NotFound("Domain configuration missing");
    }

    const site = await getSite(domain, db);
    return { site };
  })
  .as("global");

async function getSite(domain: string, db: DBtype) {
  // 此时传入的 domain 应该是纯净的 "dongqifootwear.com"
  const res = await db.query.siteTable.findFirst({
    where: {
      domain
    }
  });

  if (!res) {
    // 这里打印的日志就能准确反应数据库到底在查什么
    console.error(`[SiteMiddleware] 数据库中找不到匹配的域名记录: "${domain}"`);
    return null; // 建议这里返回 null，在 derive 里 throw，逻辑更清晰
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
