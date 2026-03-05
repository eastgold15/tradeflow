// app/[slug]/page.tsx
// 动态内容页面 - 根据 slug 查询 site_config 表并渲染内容

import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";
import { MDXWrapper, mdxComponents } from "@/components/mdx/mdx-components";
import { db } from "~/db/connection";

export const revalidate = 0;

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 根据 slug 查询配置
  const config = await db.query.siteConfigTable.findFirst({
    where: {
      key: slug,
      visible: true,
    },
  });

  if (!config) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <MDXWrapper>
        <MDXRemote
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
            },
          }}
          source={config.value}
        />
      </MDXWrapper>
    </main>
  );
}
