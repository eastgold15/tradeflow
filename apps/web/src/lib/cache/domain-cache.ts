/**
 * 通用缓存工具 - Redis 缓存
 * 用于缓存各种数据（站点信息、SEO配置、分类树、产品列表等）
 */

import { CACHE_TTL } from "./redis";
import { RedisCache } from "./redis-cache";

// ============================================================================
// Redis 缓存实例
// ============================================================================

export const redisCache = new RedisCache();

/**
 * 分类树缓存
 * key: "category:{siteId}"
 */
export const categoryTreeCache = {
  getOrFetch: <T>(siteId: string, fetchFn: () => Promise<T>) =>
    redisCache.getOrFetch(
      `category:${siteId}`,
      fetchFn,
      CACHE_TTL.CATEGORY_TREE
    ),

  delete: (siteId: string) => redisCache.delete(`category:${siteId}`),

  deleteByPrefix: (prefix: string) =>
    redisCache.deleteByPrefix(`category:${prefix}`),
};

/**
 * 产品列表缓存
 * key: "product:{siteId}:{categoryId}:{page}:{limit}"
 */
export const productListCache = {
  getOrFetch: <T>(
    siteId: string,
    query: { page?: number; limit?: number; categoryId?: string },
    fetchFn: () => Promise<T>
  ) => {
    const queryKey = `${siteId}:${query.categoryId || "all"}:${query.page || 1}:${query.limit || 10}`;
    return redisCache.getOrFetch(
      `product:${queryKey}`,
      fetchFn,
      CACHE_TTL.PRODUCT_LIST
    );
  },

  delete: (siteId: string, categoryId?: string) => {
    if (categoryId) {
      return redisCache.delete(`product:${siteId}:${categoryId}`);
    }
    return redisCache.deleteByPrefix(`product:${siteId}`);
  },

  deleteByPrefix: (siteId: string) =>
    redisCache.deleteByPrefix(`product:${siteId}`),
};

/**
 * 站点配置缓存
 * key: "config:{siteId}:{key}"
 */
export const siteConfigCache = {
  getOrFetch: <T>(siteId: string, key: string, fetchFn: () => Promise<T>) =>
    redisCache.getOrFetch(
      `config:${siteId}:${key}`,
      fetchFn,
      CACHE_TTL.SITE_CONFIG
    ),

  delete: (siteId: string, key?: string) => {
    if (key) {
      return redisCache.delete(`config:${siteId}:${key}`);
    }
    return redisCache.deleteByPrefix(`config:${siteId}`);
  },

  deleteByPrefix: (siteId: string) =>
    redisCache.deleteByPrefix(`config:${siteId}`),
};

/**
 * 站点信息缓存（Redis 版本）
 * key: "site:{domain}"
 */
export const siteInfoCache = {
  getOrFetch: <T>(domain: string, fetchFn: () => Promise<T>) =>
    redisCache.getOrFetch(`site:${domain}`, fetchFn, CACHE_TTL.SITE_INFO),

  delete: (domain: string) => redisCache.delete(`site:${domain}`),

  deleteByPrefix: (prefix: string) =>
    redisCache.deleteByPrefix(`site:${prefix}`),
};

/**
 * SEO 配置缓存
 * key: "seo:{siteId}:{code}"
 */
export const seoConfigCache = {
  getOrFetch: <T>(siteId: string, code: string, fetchFn: () => Promise<T>) =>
    redisCache.getOrFetch(
      `seo:${siteId}:${code}`,
      fetchFn,
      CACHE_TTL.SEO_CONFIG
    ),

  delete: (siteId: string, code?: string) => {
    if (code) {
      return redisCache.delete(`seo:${siteId}:${code}`);
    }
    return redisCache.deleteByPrefix(`seo:${siteId}:`);
  },

  clear: () => redisCache.deleteByPrefix("seo:"),
};

/**
 * Hero Card 缓存
 * key: "hero:{siteId}"
 */
export const heroCardCache = {
  getOrFetch: <T>(siteId: string, fetchFn: () => Promise<T>) =>
    redisCache.getOrFetch(`hero:${siteId}`, fetchFn, 5 * 60), // 5分钟

  delete: (siteId: string) => redisCache.delete(`hero:${siteId}`),

  deleteByPrefix: (prefix: string) =>
    redisCache.deleteByPrefix(`hero:${prefix}`),
};

/**
 * 广告缓存
 * key: "ad:{siteId}:{date}" - 按日期缓存
 */
export const adCache = {
  getOrFetch: <T>(siteId: string, fetchFn: () => Promise<T>) => {
    // 使用当前日期作为缓存键的一部分，确保广告按时更新
    const today = new Date().toISOString().split("T")[0];
    return redisCache.getOrFetch(`ad:${siteId}:${today}`, fetchFn, 1 * 60); // 1分钟
  },

  delete: (siteId: string) => redisCache.deleteByPrefix(`ad:${siteId}`),

  deleteByPrefix: (prefix: string) => redisCache.deleteByPrefix(`ad:${prefix}`),
};
