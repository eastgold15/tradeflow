/**
 * SEO 工具函数 - 服务器端使用
 * 从数据库获取 SEO 配置并生成 Metadata
 */

import { Metadata } from "next";

import { db } from "~/db/connection";
import { getSite } from "./site";
import { seoConfigCache } from "./cache/domain-cache";

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
    // 1. 从请求头获取站点信息（支持多域名）
    const site = await getSite();

    if (!site) {
      console.warn(`[SEO] No site found, using fallback metadata for code: "${code}"`);
      return fallback || getDefaultMetadata();
    }

    // 2. 使用缓存
    const metadata = await seoConfigCache.getOrFetch(site.id, code, async () => {
      return fetchSeoMetadata(site.id, site.tenantId, site.domain, code, fallback);
    });

    return metadata;
  } catch (error) {
    console.error(`[SEO] Failed to fetch SEO config for "${code}":`, error);
    return fallback || getDefaultMetadata();
  }
}

/**
 * 从数据库获取 SEO 配置
 */
async function fetchSeoMetadata(
  siteId: string,
  tenantId: string,
  domain: string,
  code: string,
  fallback?: Partial<Metadata>
): Promise<Metadata> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[SEO] Fetching config:`, {
      siteId,
      tenantId,
      domain,
      code,
    });
  }

  // 查询 SEO 配置（匹配 siteId + code + tenantId）
  const config = await db.query.seoConfigTable.findFirst({
    where: {
      siteId,
      tenantId,
      code: code,
      isActive: true,
    },
  });

  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[SEO] No config found for`, {
        siteId,
        tenantId,
        code,
        fallback: !!fallback,
      });
    }
    return fallback || getDefaultMetadata();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[SEO] Found config:`, {
      siteId,
      code: config.code,
      title: config.title,
      description: config.description?.substring(0, 50) + "...",
    });
  }

  // 构建 metadataBase
  const cleanDomain = domain.replace(/^https?:\/\//, "");
  const metadataBase =
    process.env.NODE_ENV === "production"
      ? new URL(`https://${cleanDomain}`)
      : new URL(`http://localhost:8001`);

  // 构建完整的 Metadata
  const metadata: Metadata = {
    metadataBase,
    title: config.title || undefined,
    description: config.description || undefined,
    keywords: config.keywords || undefined,
    openGraph: {
      title: config.ogTitle || config.title || undefined,
      description: config.ogDescription || config.description || undefined,
      images: config.ogImage ? [{ url: config.ogImage }] : undefined,
      type: (config.ogType as any) || "website",
      url: config.canonicalUrl || undefined,
    },
    twitter: config.twitterCard
      ? {
        card: config.twitterCard as "summary" | "summary_large_image",
        title: config.twitterTitle || config.title || undefined,
        description:
          config.twitterDescription || config.description || undefined,
        images: config.twitterImage ? [config.twitterImage] : undefined,
      }
      : undefined,
    alternates: config.canonicalUrl
      ? { canonical: config.canonicalUrl }
      : undefined,
    robots: config.robots || undefined,
  };

  return metadata;
}

/**
 * 获取默认的 SEO Metadata
 */
export function getDefaultMetadata(): Metadata {
  return {
    title: "mo ren New Era Fashions - 专业服装出口供应商 | OEM/ODM定制",
    description:
      "HUAIXIN APPAREL CITY 提供女装、男装、礼服等全品类服装批发与定制服务，支持全球出口订单。",
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
  seoConfigCache.clear();
}

/**
 * 清除指定站点的 SEO 缓存
 * @param siteId - 站点 ID
 */
export function clearSiteSeoCache(siteId: string): void {
  seoConfigCache.delete(siteId);
}
