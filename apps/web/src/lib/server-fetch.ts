/**
 * Server Component 数据获取辅助函数
 *
 * 问题：Server Component 在服务端渲染时，需要知道当前请求的域名才能获取正确的数据
 * 解决：直接从数据库读取，通过 next/headers 获取当前请求的域名信息
 */

import { siteCategoryTable, siteConfigTable } from "@repo/contract";
import { eq } from "drizzle-orm";

import { db } from "~/db/connection";
import { siteInfoCache } from "./cache/domain-cache";

/**
 * 规范化域名
 */
const normalizeDomain = (h: string) =>
  h.split(":")[0].toLowerCase().replace(/^www\./, "");

/**
 * 获取当前请求的站点信息
 * Server Component 安全
 */
export async function getCurrentSite() {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();

    // 1. 优先使用 proxy.ts 设置的 x-site-domain
    let domain = headersList.get("x-site-domain") || "";

    // 2. 如果没有，从 host 获取
    if (!domain) {
      const host = headersList.get("host") || "";
      domain = normalizeDomain(host);
    }

    // 3. 开发环境兜底
    if (!domain || domain === "localhost" || domain === "127.0.0.1") {
      domain = process.env.DOMAIN || "dongqishoes.com";
    }

    console.log("[server-fetch] Getting site for domain:", domain);

    // 从缓存或数据库获取站点信息
    const site = await siteInfoCache.getOrFetch(domain, () => getSiteFromDb(domain));

    return site;
  } catch (error) {
    console.error("[server-fetch] Error getting current site:", error);
    return null;
  }
}

/**
 * 从数据库查询站点
 */
async function getSiteFromDb(domain: string) {
  const site = await db.query.siteTable.findFirst({
    where: {
      domain,
    },
  });

  if (!site) {
    console.error(`[server-fetch] Site not found for domain: "${domain}"`);
  }

  return site;
}

/**
 * 获取当前站点的分类树
 * Server Component 安全
 */
export async function getSiteCategoriesForSSR() {
  const site = await getCurrentSite();

  if (!site) {
    console.error("[server-fetch] No site found, returning empty categories");
    return [];
  }

  console.log("[server-fetch] Fetching categories for siteId:", site.id);

  // 获取所有分类（扁平列表），按 sortOrder 排序
  const allCategories = await db.query.siteCategoryTable.findMany({
    where: {
      siteId: site.id,
    },
    orderBy: (siteCategoryTable, { asc }) => [asc(siteCategoryTable.sortOrder)],
  });

  // 在内存中构建树形结构
  const categoryMap = new Map();
  const rootCategories = [];

  // 先将所有分类存入 map
  for (const category of allCategories) {
    categoryMap.set(category.id, {
      ...category,
      children: [],
    });
  }

  // 构建父子关系
  for (const category of allCategories) {
    const node = categoryMap.get(category.id);
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootCategories.push(node);
    }
  }

  console.log("[server-fetch] Returning", rootCategories.length, "root categories");
  return rootCategories;
}

/**
 * 获取站点配置值
 * Server Component 安全
 */
export async function getSiteConfigValueForSSR(key: string) {
  const site = await getCurrentSite();

  if (!site) {
    console.error("[server-fetch] No site found for config key:", key);
    return null;
  }

  const config = await db.query.siteConfigTable.findFirst({
    where: {
      key,
      siteId: site.id,  // 🔥 关键：必须加上 siteId 过滤
    },
  });

  console.log("[server-fetch] Config value for key:", key, "=", config?.value || "null");
  return config?.value || null;
}

/**
 * 获取站点 JSON 配置
 * Server Component 安全
 */
export async function getSiteConfigJsonForSSR<T = any>(key: string): Promise<T | null> {
  const site = await getCurrentSite();

  if (!site) {
    console.error("[server-fetch] No site found for config JSON key:", key);
    return null;
  }

  const config = await db.query.siteConfigTable.findFirst({
    where: {
      key,
      siteId: site.id,  // 🔥 关键：必须加上 siteId 过滤
    },
  });

  console.log("[server-fetch] Config JSON for key:", key, "found:", !!config?.jsonValue);
  return config?.jsonValue as T || null;
}
