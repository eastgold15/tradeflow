import type { MDXComponents } from "next-mdx-remote-client/rsc";

/**
 * 自定义 Alert 组件
 */
function Alert({
  type = "info",
  children,
}: {
  type?: "success" | "info" | "warning" | "error";
  children: React.ReactNode;
}) {
  const baseClass = "my-4 rounded p-4";
  const typeClass =
    type === "success"
      ? "bg-green-100 text-green-800"
      : type === "warning"
        ? "bg-yellow-100 text-yellow-800"
        : type === "error"
          ? "bg-red-100 text-red-800"
          : "bg-blue-100 text-blue-800";

  return <div className={`${baseClass} ${typeClass}`}>{children}</div>;
}

/**
 * MDX 容器组件 - 自动应用 prose 样式
 * 使用 Tailwind Typography 插件的基础样式，支持深色模式
 *
 * 使用方法：
 * <MDXWrapper>
 *   <MDXRemote source={content} components={mdxComponents} />
 * </MDXWrapper>
 */
export function MDXWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
      {children}
    </div>
  );
}

/**
 * 共享 MDX 组件定义
 * 用于 next-mdx-remote-client 的 RSC 模式
 *
 * 使用 MDXWrapper 容器自动应用 Tailwind Typography 插件的 prose 样式
 * 这里只定义自定义组件，基础的 HTML 元素样式由 prose 类处理
 */
export const mdxComponents: MDXComponents = {
  Alert,



  // 1. 强调容器：用于"我们收集的信息"或"您的权利"
  Section: ({ title, icon: Icon, children, className }: any) => (
    <div className={`my-8 p-6 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
      <div className="flex items-center gap-2 mb-4 not-prose">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h2 className="text-xl font-bold m-0">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  ),


  // 2. 数据表格：清晰列出收集项、目的、保存期限
  DataTable: ({ data }: { data: { item: string; purpose: string; limit: string }[] }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Data type</th>
            <th className="text-left py-2">Purpose of processing</th>
            <th className="text-left py-2">Retention period</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 font-medium">{row.item}</td>
              <td className="py-2 text-muted-foreground">{row.purpose}</td>
              <td className="py-2 text-muted-foreground">{row.limit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),

  // 3. 重点高亮：用于法律告知、联系方式等
  Notice: ({ type = "info", children }: any) => {
    const styles = {
      info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800",
      warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800",
    };
    return (
      <div className={`max-w-none p-4 border-l-4 rounded-r-md my-4 ${styles[type as keyof typeof styles]}`}>
        {children}
      </div>
    );
  },
};
