// app/legal/[slug]/page.tsx

import { eq, and } from "drizzle-orm";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { db } from "~/db/connection";
export const revalidate = 0; // 或者 3600 (一小时更新一次)

export default async function Page({ params }: { params: { slug: string } }) {
  // 1. 获取 URL 中的 slug，比如 "privacy-policy"
  const { slug } = params;

  // 2. 直接在服务端查库，不需要 fetch(api/...)
  const config = await db.query.siteConfigTable.findFirst({
    where: {
      key: slug,
      visible: true,
    }
  });

  // 3. 容错处理
  if (!config) {
    return <div>404 - 您请求的协议不存在</div>;
  }

  // 4. 将查到的 mdx 内容返回
  return (
    <main className="mx-auto max-w-4xl p-8">
      <MDXRemote source={config.value} components={mdxComponents} />
    </main>
  );
}