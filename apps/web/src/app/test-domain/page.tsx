import { getCurrentSite } from "@/lib/server-fetch";
import { headers } from "next/headers";

/**
 * 测试页面 - 验证域名解析是否正确
 * 访问 /test-domain 查看当前请求的域名信息
 */
export default async function TestDomainPage() {
  // 获取当前请求的所有 headers
  const headersList = await headers();
  const host = headersList.get("host") || "unknown";
  const xSiteDomain = headersList.get("x-site-domain") || "not set";

  // 获取解析后的站点信息
  const site = await getCurrentSite();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-6 text-2xl font-bold">域名解析测试</h1>

        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="mb-2 font-semibold text-lg">请求信息</h2>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Host:</span> {host}</p>
              <p><span className="font-medium">x-site-domain:</span> {xSiteDomain}</p>
            </div>
          </div>

          <div className="rounded border p-4">
            <h2 className="mb-2 font-semibold text-lg">解析后的站点信息</h2>
            {site ? (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">站点 ID:</span> {site.id}</p>
                <p><span className="font-medium">站点名称:</span> {site.name}</p>
                <p><span className="font-medium">站点域名:</span> {site.domain}</p>
                <p><span className="font-medium">是否激活:</span> {site.isActive ? "是" : "否"}</p>
              </div>
            ) : (
              <p className="text-red-500">❌ 未找到站点信息</p>
            )}
          </div>

          <div className="rounded border border-yellow-300 bg-yellow-50 p-4">
            <h2 className="mb-2 font-semibold text-lg">验证方法</h2>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>用不同域名访问此页面（如 domain1.com, domain2.com）</li>
              <li>查看 "站点名称" 是否不同</li>
              <li>如果相同，说明域名解析有问题</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
