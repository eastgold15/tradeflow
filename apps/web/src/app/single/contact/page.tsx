import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { fetchPageContent } from "@/lib/fetch-page-content";
import { mdxComponents } from "@/components/mdx/mdx-components";

export default async function ContactPage() {
  // 从服务器获取 MDX 内容
  const markdown = await fetchPageContent(
    SITE_CONFIG_KEY_ENUM.PAGE_CONTACT_CONTENT
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MDXRemote components={mdxComponents} source={markdown} />
      </div>
    </div>
  );
}
