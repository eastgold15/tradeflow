import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  // 1. 初始值设为 false，防止 SSR 阶段 window 对象未定义报错
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // 2. 只有在客户端运行时才执行
    const media = window.matchMedia(query);

    // 3. 同步初始状态
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    // 4. 定义监听器函数，监听屏幕尺寸变化
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    // 6. 组件卸载时销毁监听器，防止内存泄漏
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [query, matches]);

  return matches;
}