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
 * 共享 MDX 组件定义
 * 用于 next-mdx-remote-client 的 RSC 模式
 */
export const mdxComponents: MDXComponents = {
  Alert,
  // 将所有的 h1 标签改为居中并添加边框样式
  h1: ({ children, ...props }: any) => (
    <h1
      {...props}
      className="text-center text-4xl font-bold my-8 pb-4 border-b border-slate-200 dark:border-slate-800"
    >
      {children}
    </h1>
  ),

  // 自定义引用块样式
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary pl-4 italic bg-muted/50 py-2">
      {children}
    </blockquote>
  ),

  // 你甚至可以添加全新的自定义组件
  CustomCard: ({ title, children }: any) => (
    <div className="p-6 border rounded-lg shadow-sm bg-card text-card-foreground">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  ),
  // 1. 强调容器：用于“我们收集的信息”或“您的权利”
  Section: ({ title, icon: Icon, children, className }: any) => (
    <div className={`my-8 p-6 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h2 className="text-xl font-bold m-0!">{title}</h2>
      </div>
      <div className="prose-sm">{children}</div>
    </div>
  ),

  // 2. 数据表格：清晰列出收集项、目的、保存期限
  DataTable: ({ data }: { data: { item: string; purpose: string; limit: string }[] }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">数据类型</th>
            <th className="text-left py-2">处理目的</th>
            <th className="text-left py-2">保留期限</th>
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
      <div className={`p-4 border-l-4 rounded r-md my-4 ${styles[type as keyof typeof styles]}`}>
        {children}
      </div>
    );
  },
};
