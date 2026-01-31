// 定义递归非空工具
export type DeepNonNullable<T> = {
  [P in keyof T]-?: T[P] extends object
  ? DeepNonNullable<NonNullable<T[P]>> // 如果是对象，继续递归
  : NonNullable<T[P]>;                // 如果是基础类型，直接去空
};

