/**
 * 通用缓存工具
 * 用于缓存各种数据（站点信息、SEO配置等）
 */

/**
 * 缓存项接口
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 缓存 TTL（毫秒），默认 10 分钟 */
  ttl?: number;
  /** 缓存名称（用于日志） */
  name?: string;
}

/**
 * 默认 TTL: 10 分钟
 */
const DEFAULT_TTL = 10 * 60 * 1000;

/**
 * 创建一个简单的 Map 缓存
 */
export class DomainCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private name: string;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? DEFAULT_TTL;
    this.name = options.name ?? "DomainCache";
  }

  /**
   * 获取缓存
   * @param key - 缓存键（可以是域名、siteId:code 等任意字符串）
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[${this.name}] Cache hit for key: "${key}"`);
    return entry.data;
  }

  /**
   * 设置缓存
   * @param key - 缓存键
   * @param data - 要缓存的数据
   */
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`[${this.name}] Cached data for key: "${key}"`);
  }

  /**
   * 删除指定缓存
   * @param key - 缓存键
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[${this.name}] Deleted cache for key: "${key}"`);
    }
  }

  /**
   * 批量删除匹配前缀的缓存
   * @param prefix - 键前缀（如 "siteId:"）
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`[${this.name}] Deleted ${count} cache entries with prefix: "${prefix}"`);
    }
    return count;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[${this.name}] Cleared ${size} cache entries`);
  }

  /**
   * 获取或设置缓存（fetch 模式）
   * @param key - 缓存键
   * @param fetchFn - 缓存未命中时的数据获取函数
   * @returns 缓存的数据或新获取的数据
   */
  async getOrFetch(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // 1. 尝试从缓存获取
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 缓存未命中，调用 fetchFn 获取数据
    console.log(`[${this.name}] Cache miss for key: "${key}", fetching...`);
    const data = await fetchFn();

    // 3. 存入缓存
    this.set(key, data);

    return data;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * 创建站点缓存实例
 * key: domain (如 "dongqifootwear.com")
 */
export const siteCache = new DomainCache<any>({
  ttl: 10 * 60 * 1000, // 10 分钟
  name: "SiteCache",
});

/**
 * 创建 SEO 配置缓存实例
 * key: "${siteId}:${code}" (如 "site-123:home")
 */
export const seoCacheInstance = new DomainCache<any>({
  ttl: 5 * 60 * 1000, // 5 分钟
  name: "SeoCache",
});
