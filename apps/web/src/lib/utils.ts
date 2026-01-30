import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



// 判断是否为外部链接
export const isExternalUrl = (url: string) => {
  return url.startsWith("http://") || url.startsWith("https://");
};
