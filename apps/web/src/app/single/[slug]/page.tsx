// app/legal/[slug]/page.tsx

import { mdxComponents } from "@/components/mdx/mdx-components";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { db } from "~/db/connection";


export const revalidate = 0;

// 1. 注意这里：params 的类型变成了 Promise
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {

  // 2. 注意这里：必须 await 才能拿到内部的 slug
  const { slug } = await params;

  // 3. 现在的 slug 就是字符串了，后面的逻辑不需要动
  const config = await db.query.siteConfigTable.findFirst({
    where: {
      key: slug,
      visible: true,
    }
  });

  console.log('config:', config);

  if (!config) {
    return <div>404 - 您请求的协议不存在</div>;
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <MDXRemote source={config.value} components={mdxComponents} />
    </main>
  );
}