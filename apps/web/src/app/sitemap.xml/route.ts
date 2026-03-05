import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSiteByDomain, normalizeDomain } from "@/lib/site";
import { db } from "~/db/connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 动态 Sitemap - 根据请求域名生成
 *
 * 访问: https://your-domain.com/sitemap.xml
 *
 * SEO 说明：
 * - 每个域名访问 /sitemap.xml 会生成该域名专属的 sitemap
 * - 只包含该站点下的产品和分类
 * - 搜索引擎爬虫会直接用域名访问，无需额外配置
 */
export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  if (!host) {
    return new NextResponse("No host found", { status: 400 });
  }

  // 标准化域名（去掉端口和 www）
  const domain = normalizeDomain(host);
  const baseUrl = `https://${domain}`;

  console.log("[sitemap] Generating sitemap for domain:", domain);

  // 直接通过域名获取站点信息（不依赖 x-site-domain header）
  const site = await getSiteByDomain(domain);

  if (!site) {
    console.error("[sitemap] No site found for domain:", domain);
    // 如果找不到站点，返回空 sitemap（避免搜索引擎报错）
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    return new NextResponse(emptyXml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  console.log("[sitemap] Found site:", site.name, "id:", site.id);

  // 获取可见产品
  const products = await db.query.siteProductTable.findMany({
    where: { siteId: site.id, isVisible: true },
    with: {
      product: {
        columns: { updatedAt: true },
      },
    },
  });

  // 获取激活分类
  const categories = await db.query.siteCategoryTable.findMany({
    where: { siteId: site.id, isActive: true },
  });

  console.log(
    "[sitemap] Found",
    products.length,
    "products and",
    categories.length,
    "categories"
  );

  // 生成 XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 首页 -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- 产品页面 (${products.length} 个) -->
  ${products
    .map(
      (p) => `
  <url>
    <loc>${baseUrl}/product/${p.slug || p.id}</loc>
    <lastmod>${p.product?.updatedAt || p.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join("")}

  <!-- 分类页面 (${categories.filter((c) => c.slug).length} 个) -->
  ${categories
    .filter((c) => c.slug)
    .map(
      (c) => `
  <url>
    <loc>${baseUrl}/category${c.slug}</loc>
    <lastmod>${c.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("")}

  <!-- 搜索页面 -->
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600", // 缓存 1 小时
    },
  });
}
