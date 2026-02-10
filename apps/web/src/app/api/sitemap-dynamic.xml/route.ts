
import { getSiteFromEnv } from "@/lib/site";
import { NextResponse } from "next/server";
import { db } from "~/db/connection";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 动态服务器端 sitemap - 从数据库获取产品和分类
 */
export async function GET() {
  const site = await getSiteFromEnv();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const baseUrl = process.env.DOMAIN
    ? `https://${process.env.DOMAIN.replace(/:\d+$/, '')}`
    : 'https://dongqishoes.com';

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

  // 生成 XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${products.map((p) => `
  <url>
    <loc>${baseUrl}/product/${p.id}</loc>
    <lastmod>${p.product?.updatedAt || p.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}
  ${categories.filter(c => c.slug).map((c) => `
  <url>
    <loc>${baseUrl}/category${c.slug}</loc>
    <lastmod>${c.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
