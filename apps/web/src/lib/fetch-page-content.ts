import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import { rpc } from "@/lib/rpc";

/**
 * 从 site_config 获取页面 MDX 内容
 * @param key - site_config 的 key
 * @returns MDX 字符串内容
 */
export async function fetchPageContent(key: string): Promise<string> {
  try {
    const response = await rpc.site_config.get(
      {
        query: { key },
        fetch: {
          next: { revalidate: false },
        },
      },

    );

    const content = response.data?.[0]?.value;

    if (!content) {
      console.warn(`[fetchPageContent] No content found for key: ${key}`);
      return getDefaultContent(key);
    }

    return content;
  } catch (error) {
    console.error(
      `[fetchPageContent] Failed to fetch page content for key: ${key}`,
      error
    );
    return getDefaultContent(key);
  }
}

/**
 * 获取默认内容（降级方案）
 * 当数据库中没有配置内容时，返回此默认内容
 */
function getDefaultContent(key: string): string {
  const defaults: Record<string, string> = {
    [SITE_CONFIG_KEY_ENUM.PAGE_ABOUT_CONTENT]: `# About Us

Content not found. Please configure the page content in site settings.`,
    [SITE_CONFIG_KEY_ENUM.PAGE_CONTACT_CONTENT]: `# Contact Us

Content not found. Please configure the page content in site settings.`,
    [SITE_CONFIG_KEY_ENUM.PAGE_PRIVACY_CONTENT]: `# Privacy Policy


Content not found. Please configure the page content in site settings.`,
    [SITE_CONFIG_KEY_ENUM.PAGE_SIZE_CONTENT]: `# Size Guide

Content not found. Please configure the page content in site settings.`,
    [SITE_CONFIG_KEY_ENUM.PAGE_TERMS_CONTENT]: `# Terms of Service

Content not found. Please configure the page content in site settings.`,
  };

  return (
    defaults[key] ||
    `# Content Not Found

Please configure the page content in site settings.`
  );
}
