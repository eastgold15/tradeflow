/**
 * OSS URL处理工具函数
 * 提供统一的URL解析和key提取功能
 */

import { HttpError } from "@pori15/logixlysia";
import { envConfig } from "~/lib/env";

// 顶层正则表达式常量，提升性能
const URL_KEY_REGEX = /^https?:\/\/[^/]+\/(.+)$/;

/**
 * 从OSS文件URL中提取正确的文件key
 * @param fileUrl 完整的文件URL
 * @returns 提取出的文件key
 */
export function extractOssKeyFromUrl(fileUrl: string): string {
  if (!fileUrl) {
    throw new HttpError.BadRequest("文件URL不能为空");
  }

  try {
    const url = new URL(fileUrl);
    let key = url.pathname;

    // 移除开头的斜杠
    if (key.startsWith("/")) {
      key = key.substring(1);
    }

    // 检查是否为阿里云OSS默认域名格式 (bucket.oss-region.aliyuncs.com)
    const hostname = url.hostname;
    const bucketName = envConfig.OSS.BUCKET || "";

    // 如果是阿里云OSS默认域名格式，直接返回pathname
    if (hostname.includes("aliyuncs.com") && hostname.startsWith(bucketName)) {
      return key;
    }

    // 如果是华为云OBS默认域名格式，直接返回pathname
    if (hostname.includes("myhuaweicloud.com")) {
      return key;
    }

    // 如果是自定义域名，可能需要特殊处理
    // 检查是否包含常见的文件夹路径
    if (key.includes("/")) {
      return key;
    }

    // 如果没有路径分隔符，可能是根目录文件
    return key;
  } catch (error) {
    console.error("URL解析失败:", fileUrl, error);

    // 降级处理：尝试简单的字符串操作
    try {
      // 移除协议和域名部分
      const keyMatch = fileUrl.match(URL_KEY_REGEX);
      if (keyMatch?.[1]) {
        return keyMatch[1];
      }

      // 如果匹配失败，抛出错误
      throw new HttpError.BadRequest("无法从URL中提取文件key");
    } catch (_error) {
      throw new HttpError.BadRequest(`无效的文件URL格式: ${fileUrl}`);
    }
  }
}

/**
 * 检查URL是否为OSS默认域名
 * @param fileUrl 文件URL
 * @returns 是否为默认域名
 */
export function isOssDefaultDomain(fileUrl: string): boolean {
  try {
    const url = new URL(fileUrl);
    const hostname = url.hostname;

    // 检查是否为阿里云OSS默认域名
    if (hostname.includes("aliyuncs.com")) {
      return true;
    }

    // 检查是否为华为云OBS默认域名
    if (hostname.includes("myhuaweicloud.com")) {
      return true;
    }

    return false;
  } catch (_error) {
    return false;
  }
}

/**
 * 检查URL是否与配置的endpoint匹配
 * @param fileUrl 文件URL
 * @returns 是否为配置的endpoint域名
 */
export function isConfiguredEndpoint(fileUrl: string): boolean {
  try {
    const url = new URL(fileUrl);
    const endpoint = envConfig.OSS.ENDPOINT || "";

    if (!endpoint) {
      return false;
    }

    // 确保endpoint有协议前缀
    const normalizedEndpoint = endpoint.startsWith("http")
      ? endpoint
      : `https://${endpoint}`;

    const endpointUrl = new URL(normalizedEndpoint);
    return url.hostname === endpointUrl.hostname;
  } catch (error) {
    console.warn("检查endpoint失败:", fileUrl, error);
    return false;
  }
}

/**
 * 验证OSS文件URL格式
 * @param fileUrl 文件URL
 * @returns 验证结果
 */
export function validateOssUrl(fileUrl: string): {
  isValid: boolean;
  error?: string;
  key?: string;
} {
  try {
    if (!fileUrl || typeof fileUrl !== "string") {
      return {
        isValid: false,
        error: "URL不能为空且必须为字符串",
      };
    }

    // 检查是否为有效的URL格式
    const url = new URL(fileUrl);

    // 检查协议
    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        isValid: false,
        error: "URL协议必须为http或https",
      };
    }

    // 提取key
    const key = extractOssKeyFromUrl(fileUrl);

    if (!key) {
      return {
        isValid: false,
        error: "无法从URL中提取有效的文件key",
      };
    }

    return {
      isValid: true,
      key,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 批量提取OSS key
 * @param fileUrls 文件URL数组
 * @returns key数组，过滤掉无效的URL
 */
export function extractOssKeysFromUrls(fileUrls: string[]): string[] {
  if (!Array.isArray(fileUrls)) {
    return [];
  }

  return fileUrls
    .map((url) => {
      try {
        return extractOssKeyFromUrl(url);
      } catch (error) {
        console.warn(`提取key失败 ${url}:`, error);
        return null;
      }
    })
    .filter((key): key is string => key !== null);
}

/**
 * 调试函数：打印URL解析信息
 * @param fileUrl 文件URL
 */
export function debugOssUrl(fileUrl: string): void {
  console.log("=== OSS URL调试信息 ===");
  console.log("原始URL:", fileUrl);

  try {
    const url = new URL(fileUrl);
    console.log("解析后的URL组件:");
    console.log("  协议:", url.protocol);
    console.log("  主机名:", url.hostname);
    console.log("  路径:", url.pathname);
    console.log("  搜索参数:", url.search);
    console.log("  哈希:", url.hash);

    const key = extractOssKeyFromUrl(fileUrl);
    console.log("提取的key:", key);

    console.log("域名检查:");
    console.log("  是否为默认域名:", isOssDefaultDomain(fileUrl));
    console.log("  是否为配置域名:", isConfiguredEndpoint(fileUrl));

    const validation = validateOssUrl(fileUrl);
    console.log("URL验证结果:", validation);
  } catch (error) {
    console.error("URL解析失败:", error);
  }
  console.log("===================");
}
