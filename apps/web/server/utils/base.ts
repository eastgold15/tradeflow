/**
 *
 * 开关不能使用！！
 * isFilled(undefined)     // false
 * isFilled(null)          // false
 * isFilled('')            // false
 * isFilled('  ')          // false（trim 后为空）
 * isFilled('0')           // true ✅（字符串 '0' 是有效值）
 * isFilled(0)             // true ✅（数字 0 是有效值，比如价格可以是 0）
 * isFilled([])            // false
 * isFilled([1])           // true
 * isFilled({})            // false
 * isFilled({ a: 1 })      // true
 *
 *
 */
export function isFilled(
  value: unknown,
  options?: { zeroIsEmpty?: boolean }
): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (options?.zeroIsEmpty && value === 0) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
}
