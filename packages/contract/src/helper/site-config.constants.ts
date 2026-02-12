/**
 * 站点配置键定义
 * 统一管理所有站点配置项的键值,确保前后端类型一致
 */

// ===== 配置键枚举 =====
export const SITE_CONFIG_KEY_ENUM = {
  // 站点基础配置
  SITE_NAME: "site_name",
  SITE_COPYRIGHT: "site_copyright",
  SITE_PHONE: "site_phone",
  SITE_EMAIL: "site_email",
  SITE_ERWEIMA: "site_erweima",

  // ICP 备案信息
  BEIAN_INFO: "beian_info",              // ICP 备案号

  // 页面内容配置
  PAGE_ABOUT_CONTENT: "page_about_content",
  PAGE_CONTACT_CONTENT: "page_contact_content",
  PAGE_PRIVACY_CONTENT: "page_privacy_content",
  PAGE_SHIP_CONTENT: "page_ship_content",
  PAGE_SIZE_CONTENT: "page_size_content",
  PAGE_TERMS_CONTENT: "page_terms_content",
  FOOTER_CONTENT: "footer_content",
} as const;

// ===== 对象格式 (用于 apps/web) =====
export const SITE_CONFIG_KEYS = SITE_CONFIG_KEY_ENUM;

// ===== 数组格式 (用于 apps/b2b-admin 下拉选择) =====
export const SITE_CONFIG_KEY_OPTIONS = [
  { value: SITE_CONFIG_KEY_ENUM.SITE_NAME, label: "网站名" },
  { value: SITE_CONFIG_KEY_ENUM.SITE_COPYRIGHT, label: "版权" },
  { value: SITE_CONFIG_KEY_ENUM.SITE_PHONE, label: "电话" },
  { value: SITE_CONFIG_KEY_ENUM.SITE_EMAIL, label: "邮箱" },
  { value: SITE_CONFIG_KEY_ENUM.SITE_ERWEIMA, label: "二维码" },
  { value: SITE_CONFIG_KEY_ENUM.PAGE_ABOUT_CONTENT, label: "关于我们" },
  { value: SITE_CONFIG_KEY_ENUM.PAGE_CONTACT_CONTENT, label: "联系我们" },
  { value: SITE_CONFIG_KEY_ENUM.PAGE_PRIVACY_CONTENT, label: "隐私政策" },
  { value: SITE_CONFIG_KEY_ENUM.PAGE_SIZE_CONTENT, label: "尺码指南" },
  { value: SITE_CONFIG_KEY_ENUM.PAGE_TERMS_CONTENT, label: "服务条款" },
  { value: SITE_CONFIG_KEY_ENUM.FOOTER_CONTENT, label: "页脚内容" },
  // ICP 备案信息
  { value: SITE_CONFIG_KEY_ENUM.BEIAN_INFO, label: "备案信息" },
] as const;

// ===== 类型定义 =====
export type SiteConfigKey =
  (typeof SITE_CONFIG_KEY_ENUM)[keyof typeof SITE_CONFIG_KEY_ENUM];
export type SiteConfigKeyOption = (typeof SITE_CONFIG_KEY_OPTIONS)[number];

// ===== 工具函数：将配置键转换为显示标签 =====
/**
 * 根据配置键获取对应的显示标签
 * @param value - 配置键（如 "site_copyright"）
 * @returns 对应的显示标签（如 "版权"），如果未找到则返回原值
 */
export function getConfigKeyLabel(value: string): string {
  const option = SITE_CONFIG_KEY_OPTIONS.find((opt) => opt.value === value);
  return option?.label || value;
}
