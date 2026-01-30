// utils/error-parser.ts

/**
 * 后端错误 value 的结构定义
 */
interface BackendErrorValue {
  type?: string;
  on?: string;
  summary?: string;
  message?: string;
  property?: string;
  [key: string]: any;
}

export function parseApiError(error: { status: number; value: BackendErrorValue } | null) {
  if (!error) return "未知错误";

  const { value, status } = error;

  // 优先级逻辑：
  // 1. 如果有 summary，通常是概括性的错误（如 "表单验证失败"）
  // 2. 如果有 message，通常是具体的错误（如 "ID 格式不正确"）
  // 3. 如果有 property，可以组合成 "字段: 错误"
  // 4. 最后保底显示错误类型或状态码

  const displayMessage =
    value.summary ||
    value.message ||
    (value.property ? `字段 ${value.property} 校验失败` : "") ||
    `请求失败 (Status: ${status})`;

  return displayMessage;
}