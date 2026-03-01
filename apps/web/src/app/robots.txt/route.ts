import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 动态 robots.txt - 根据请求域名生成
 *
 * 访问: https://your-domain.com/robots.txt
 */
export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const domain = host.split(":")[0];
  const baseUrl = `https://${domain}`;

  const robotsTxt = `# *
User-agent: *
Allow: /
Disallow: /api
Disallow: /ws
Disallow: /_next

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400", // 缓存 24 小时
    },
  });
}
