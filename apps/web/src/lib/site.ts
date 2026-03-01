/**
 * 站点工具函数 - 根据 domain 获取站点信息
 *
 * 多域名场景：站点信息从请求头 x-site-domain 获取（由 proxy.ts 设置）
 * 而不是从环境变量获取
 */

import { db } from "~/db/connection";

export interface Site {
  id: string;
  tenantId: string;
  domain: string;
  name: string;
  siteType: "group" | "factory";
  boundDeptId: string | null;
}

/**
 * 规范化域名
 * 1. 去除端口号
 * 2. 转换为小写
 * 3. 移除 www. 前缀
 */
export function normalizeDomain(rawHost: string): string {
  return rawHost
    .split(":")[0] // 去除端口号
    .toLowerCase() // 转小写
    .replace(/^www\./, ""); // 移除 www. 前缀
}

/**
 * 从请求头获取站点信息
 * 这是多域名场景下获取站点的唯一正确方式
 *
 * @returns 站点信息，如果找不到则返回 null
 */
export async function getSite(): Promise<Site | null> {
  try {
    // 动态导入 headers 避免在非 Next.js 环境中报错
    const { headers } = await import("next/headers");
    const headersList = await headers();

    // 获取 proxy.ts 设置的域名
    const domainHeader = headersList.get("x-site-domain");

    if (!domainHeader) {
      console.error(`[Site] No x-site-domain header found. This should never happen in production.`);
      return null;
    }

    const normalizedDomain = normalizeDomain(domainHeader);

    // 查询数据库获取站点信息
    const site = await db.query.siteTable.findFirst({
      where: {
        domain: normalizedDomain
      },
    });

    if (!site) {
      console.error(`[Site] Site not found for domain: "${normalizedDomain}"`);
      return null;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Site] Found site:`, {
        id: site.id,
        name: site.name,
        domain: site.domain,
        tenantId: site.tenantId,
        siteType: site.siteType
      });
    }

    return site as Site;
  } catch (error) {
    console.error(`[Site] Error getting site:`, error);
    return null;
  }
}

/**
 * 直接通过域名获取站点（供服务端使用，如 Elysia 中间件）
 */
export async function getSiteByDomain(domain: string): Promise<Site | null> {
  try {
    const normalizedDomain = normalizeDomain(domain);

    const site = await db.query.siteTable.findFirst({
      where: {
        domain: normalizedDomain
      },
    });

    if (!site) {
      console.error(`[Site] Site not found for domain: "${normalizedDomain}"`);
      return null;
    }

    return site as Site;
  } catch (error) {
    console.error(`[Site] Error getting site by domain "${domain}":`, error);
    return null;
  }
}
