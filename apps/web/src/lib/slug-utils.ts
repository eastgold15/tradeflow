/**
 * Slug 工具函数
 * 用于生成 SEO 友好的 URL
 */

/**
 * 生成 SEO 友好的 slug
 * 将商品名称转换为 URL 友好的格式
 */
export function generateSlug(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // 保留中文字符和连字符
    .replace(/\s+/g, '-')                  // 空格替换为连字符
    .replace(/-+/g, '-')                   // 多个连字符合并为一个
    .replace(/^-+/, '')                    // 移除开头的连字符
    .replace(/-+$/, '');                   // 移除结尾的连字符
}

/**
 * 为商品生成唯一的 slug
 * 格式: {商品名}-{id后4位}
 * 例如: leather-flats-with-bow-a7f4
 */
export function generateProductSlug(
  siteName: string | null,
  productName: string,
  productId: string
): string {
  const name = siteName || productName;
  const nameSlug = generateSlug(name);

  // 取 productId 的后 4 位作为后缀，确保唯一性
  const idSuffix = productId.slice(-4);

  return `${nameSlug}-${idSuffix}`;
}
