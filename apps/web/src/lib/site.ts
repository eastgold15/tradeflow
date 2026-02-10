/**
 * 站点工具函数 - 根据 domain 获取站点信息
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
 * 直接从环境变量获取站点信息
 * 不再依赖请求头，统一使用环境变量中的 DOMAIN
 *
 * @returns 站点信息，如果找不到则返回 null
 */
export async function getSiteFromEnv(): Promise<Site | null> {
  // 直接从环境变量获取域名
  const rawDomain = process.env.DOMAIN;

  if (!rawDomain) {
    console.error(`[Site] DOMAIN environment variable not found`);
    console.error(`[Site] Please set DOMAIN in .env.development or .env.production`);
    return null;
  }

  // 规范化域名（去除端口号）
  const finalDomain = normalizeDomain(rawDomain);

  console.log(`[Site] Using domain from environment: "${rawDomain}" -> "${finalDomain}"`);

  if (!finalDomain) {
    console.error(`[Site] No valid domain found. Raw domain: "${rawDomain}"`);
    return null;
  }

  try {
    const site = await db.query.siteTable.findFirst({
      where: {
        domain: finalDomain
      },
    });

    if (!site) {
      console.error(`[Site] Site not found for domain: "${finalDomain}"`);
      console.error(`[Site] Please ensure the site exists in the database`);
      return null;
    }

    console.log(`[Site] Found site:`, {
      id: site.id,
      name: site.name,
      domain: site.domain,
      tenantId: site.tenantId,
      siteType: site.siteType
    });

    return site as Site;
  } catch (error) {
    console.error(`[Site] Error fetching site for domain "${finalDomain}":`, error);
    return null;
  }
}
