/**
 * SEO 工具函数 - 服务器端使用
 * 从数据库获取 SEO 配置并生成 Metadata
 */

import { Metadata } from "next";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "~/db/connection";
import { seoConfigTable } from "@repo/contract";
import { getSiteFromEnv } from "./site";

/**
 * SEO 配置缓存
 * key: "${siteId}:${code}"
 * value: CacheEntry
 */
const seoCache = new Map<string, CacheEntry>();

/**
 * 缓存 TTL（毫秒）- 5 分钟
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 缓存项接口
 */
interface CacheEntry {
  metadata: Metadata;
  timestamp: number;
}

/**
 * 根据 code 获取 SEO 配置并生成 Metadata
 * @param code - SEO 配置的唯一标识，如 "home", "product-list"
 * @param fallback - 默认的 SEO 配置（当数据库中没有配置时使用）
 */
export async function getSeoMetadata(
  code: string,
  fallback?: Partial<Metadata>
): Promise<Metadata> {
  try {
    // 1. 从环境变量获取站点信息
    const site = await getSiteFromEnv();

    if (!site) {
      console.warn(`[SEO] No site found, using fallback metadata for code: "${code}"`);
      return fallback || getDefaultMetadata();
    }

    // 2. 检查缓存
    const cacheKey = `${site.id}:${code}`;
    const cachedEntry = seoCache.get(cacheKey) as CacheEntry | undefined;

    if (cachedEntry) {
      const isExpired = Date.now() - cachedEntry.timestamp > CACHE_TTL;
      if (!isExpired) {
        console.log(`[SEO] Cache hit for key: "${cacheKey}"`);
        return cachedEntry.metadata;
      } else {
        console.log(`[SEO] Cache expired for key: "${cacheKey}", fetching from database`);
        seoCache.delete(cacheKey);
      }
    }

    // 3. 添加调试日志
    console.log(`[SEO] Fetching config:`, {
      siteId: site.id,
      tenantId: site.tenantId,
      domain: site.domain,
      code: code
    });

    // 4. 查询 SEO 配置（匹配 siteId + code + tenantId）
    const config = await db.query.seoConfigTable.findFirst({
      where: {
        siteId: site.id,
        tenantId: site.tenantId,
        code: code,
        isActive: true,
      }
    });

    if (!config) {
      console.warn(`[SEO] No config found for`, {
        siteId: site.id,
        tenantId: site.tenantId,
        code: code,
        fallback: !!fallback
      });
      return fallback || getDefaultMetadata();
    }

    console.log(`[SEO] Found config:`, {
      siteId: site.id,
      code: config.code,
      title: config.title,
      description: config.description?.substring(0, 50) + "..."
    });

    // 5. 构建 metadataBase
    const metadataBase = process.env.NODE_ENV === 'production'
      ? new URL(`https://${site.domain}`)
      : new URL(`http://localhost:8001`);

    // 6. 构建完整的 Metadata
    const metadata: Metadata = {
      metadataBase,
      title: config.title || undefined,
      description: config.description || undefined,
      keywords: config.keywords || undefined,
      openGraph: {
        title: config.ogTitle || config.title || undefined,
        description: config.ogDescription || config.description || undefined,
        images: config.ogImage
          ? [{ url: config.ogImage }]
          : undefined,
        type: (config.ogType as any) || "website",
        url: config.canonicalUrl || undefined,
      },
      twitter: config.twitterCard
        ? {
          card: config.twitterCard as "summary" | "summary_large_image",
          title: config.twitterTitle || config.title || undefined,
          description: config.twitterDescription || config.description || undefined,
          images: config.twitterImage ? [config.twitterImage] : undefined,
        }
        : undefined,
      alternates: config.canonicalUrl
        ? { canonical: config.canonicalUrl }
        : undefined,
      robots: config.robots || undefined,
    };

    // 7. 存入缓存
    seoCache.set(cacheKey, {
      metadata,
      timestamp: Date.now()
    });

    console.log(`[SEO] Cached metadata for key: "${cacheKey}"`);

    return metadata;
  } catch (error) {
    console.error(`[SEO] Failed to fetch SEO config for "${code}":`, error);
    return fallback || getDefaultMetadata();
  }
}

/**
 * 获取默认的 SEO Metadata
 */
export function getDefaultMetadata(): Metadata {
  return {
    title: "New Era Fashions - 专业服装出口供应商 | OEM/ODM定制",
    description: "HUAIXIN APPAREL CITY 提供女装、男装、礼服等全品类服装批发与定制服务，支持全球出口订单。",
    keywords: "服装批发, 外贸服装, OEM定制, 服装厂家, 时尚女装, 男装批发, 礼服定制",
    openGraph: {
      title: "New Era Fashions - 全球服装供应商",
      description: "高品质服装出口，支持OEM/ODM，快速打样，一站式采购。",
      images: [
        {
          url: "/og-fashion.jpg",
          width: 1200,
          height: 630,
          alt: "New Era Fashions 时尚服装展示",
        },
      ],
      url: "https://www.newera-fashions.com",
      type: "website",
    },
    alternates: {
      canonical: "https://www.newera-fashions",
    },
  };
}


/**
 * 清除 SEO 缓存
 * 用于配置更新后刷新缓存
 */
export function clearSeoCache(): void {
  seoCache.clear();
  console.log(`[SEO] Cache cleared`);
}

/**
 * 清除指定站点的 SEO 缓存
 * @param siteId - 站点 ID
 */
export function clearSiteSeoCache(siteId: string): void {
  const keysToDelete: string[] = [];

  for (const key of seoCache.keys()) {
    if (key.startsWith(`${siteId}:`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => seoCache.delete(key));
  console.log(`[SEO] Cleared ${keysToDelete.length} cache entries for site: "${siteId}"`);
}

