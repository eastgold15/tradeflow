import { fetchPageContent } from "@/lib/fetch-page-content";
import { mdxComponents } from "@/lib/mdx-components";
import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import { MDXRemote } from "next-mdx-remote-client/rsc";

// app/about/page.tsx
export const dynamic = 'force-dynamic'; // 确保不被静态化

export default async function AboutPage() {
  const markdown = await fetchPageContent(SITE_CONFIG_KEY_ENUM.PAGE_ABOUT_CONTENT);

  // 打印一下，看看生产环境下 log 输出了什么
  console.log("Markdown received:", markdown.substring(0, 50));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MDXRemote components={mdxComponents} source={markdown} />
      </div>
    </div>
  );
}