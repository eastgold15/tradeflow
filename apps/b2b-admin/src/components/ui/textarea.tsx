import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, value, ...props }: React.ComponentProps<"textarea">) {
  // 将 null 转换为 undefined，防止 React 控制组件警告
  const safeValue = value === null ? undefined : value;

  return (
    <textarea
      className={cn(
        "field-sizing-content flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className
      )}
      data-slot="textarea"
      value={safeValue}
      {...props}
    />
  );
}

export { Textarea };
