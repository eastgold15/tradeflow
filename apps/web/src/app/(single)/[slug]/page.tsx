// app/[slug]/page.tsx
// 动态内容页面 - 根据 slug 查询 site_config 表并渲染内容

import { mdxComponents, MDXWrapper } from "@/components/mdx/mdx-components";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { db } from "~/db/connection";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 根据 slug 查询配置
  const config = await db.query.siteConfigTable.findFirst({
    where: {
      key: slug,
      visible: true,
    }
  });

  if (!config) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <MDXWrapper>
        <MDXRemote source={config.value} components={mdxComponents} />
      </MDXWrapper>
    </main>
  );
}
