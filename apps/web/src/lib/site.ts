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
  // 其他字段...
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
 * 根据域名获取站点信息
 * @param domain - 域名（可以是原始格式，会自动规范化）
 * @returns 站点信息，如果找不到则返回 null
 */
export async function getSiteByDomain(domain: string): Promise<Site | null> {
  const normalizedDomain = normalizeDomain(domain);

  // 兜底逻辑：如果是本地地址，使用环境变量
  const finalDomain =
    !normalizedDomain ||
      normalizedDomain === "localhost" ||
      normalizedDomain === "127.0.0.1"
      ? normalizeDomain(process.env.DOMAIN || "")
      : normalizedDomain;

  if (!finalDomain) {
    console.error("[Site] No domain found in Host header or DOMAIN env");
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
      return null;
    }

    return site as Site;
  } catch (error) {
    console.error(`[Site] Error fetching site for domain "${finalDomain}":`, error);
    return null;
  }
}

/**
 * 从请求头中获取站点信息
 * @param headers - Next.js 请求头
 * @returns 站点信息，如果找不到则返回 null
 */
export async function getSiteFromHeaders(
  headers: Headers
): Promise<Site | null> {
  const rawHost = headers.get("host") || headers.get("x-forwarded-host") || "";
  return getSiteByDomain(rawHost);
}
