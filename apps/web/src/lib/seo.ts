/**
 * SEO 工具函数 - 服务器端使用
 * 从数据库获取 SEO 配置并生成 Metadata
 */

import { Metadata } from "next";
import { headers } from "next/headers";

import { db } from "~/db/connection";
import { getSiteFromHeaders } from "./site";

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
    // 1. 从请求头中获取站点信息
    const headersList = await headers();
    const site = await getSiteFromHeaders(headersList as any);

    if (!site) {
      console.warn(`[SEO] No site found, using fallback metadata for code: "${code}"`);
      return fallback || getDefaultMetadata();
    }

    // 2. 查询 SEO 配置（匹配 siteId + code）
    const config = await db.query.seoConfigTable.findFirst({
      where: {
        siteId: site.id,
        code: code,
        isActive: true,
      }
    });

    if (!config) {
      // 如果没有找到配置，使用默认配置
      return fallback || getDefaultMetadata();
    }

    // 1. 定义 metadataBase（区分本地开发和线上环境）
    const metadataBase = process.env.NODE_ENV === 'production'
      ? new URL(process.env.DOMAIN!) // 替换成你的线上域名（比如 https://www.example.com）
      : new URL('http://localhost:3000'); // 本地开发地址（对应你的 Next.js 启动端口）

    // 3. 构建完整的 Metadata
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
      canonical: "https://www.newera-fashions.com",
    },
  };
}

/**
 * 根据页面类型获取 SEO 配置
 * @param pageType - 页面类型 (home, product, category, inquiry, custom)
 * @param fallback - 默认配置
 */
export async function getSeoMetadataByPageType(
  pageType: string,
  fallback?: Partial<Metadata>
): Promise<Metadata> {
  try {
    const headersList = await headers();
    const site = await getSiteFromHeaders(headersList as any);

    if (!site) {
      return fallback || getDefaultMetadata();
    }

    const config = await db.query.seoConfigTable.findFirst({
      where: {
        siteId: site.id,
        pageType,
        isActive: true,
      }
    });

    if (!config) {
      return fallback || getDefaultMetadata();
    }

    // 使用与 getSeoMetadata 相同的逻辑构建 metadata
    return buildMetadataFromConfig(config);
  } catch (error) {
    console.error(`[SEO] Failed to fetch SEO config for pageType "${pageType}":`, error);
    return fallback || getDefaultMetadata();
  }
}

/**
 * 从配置对象构建 Metadata（内部辅助函数）
 */
function buildMetadataFromConfig(config: any): Metadata {
  return {
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
        description: config.twitterDescription || config.description || undefined,
        images: config.twitterImage ? [config.twitterImage] : undefined,
      }
      : undefined,
    alternates: config.canonicalUrl
      ? { canonical: config.canonicalUrl }
      : undefined,
    robots: config.robots || undefined,
  };
}

