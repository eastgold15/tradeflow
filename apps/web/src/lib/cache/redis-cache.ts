/**
 * Redis 缓存工具类
 * 提供类型安全的缓存操作
 */

import { cacheKey, getRedis } from "./redis";

export class RedisCache {
  /**
   * 获取缓存
   * @param key - 缓存键（不带前缀）
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const data = await redis.get(cacheKey(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`[RedisCache] Error getting key "${key}":`, error);
      return null;
    }
  }

  /**
   * 设置缓存
   * @param key - 缓存键（不带前缀）
   * @param value - 要缓存的数据
   * @param ttl - 过期时间（秒）
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const redis = getRedis();
      const str = JSON.stringify(value);
      await redis.setex(cacheKey(key), ttl, str);
    } catch (error) {
      console.error(`[RedisCache] Error setting key "${key}":`, error);
    }
  }

  /**
   * 删除指定缓存
   * @param key - 缓存键（不带前缀）
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(cacheKey(key));
    } catch (error) {
      console.error(`[RedisCache] Error deleting key "${key}":`, error);
    }
  }

  /**
   * 批量删除匹配前缀的缓存
   * @param prefix - 键前缀（不带 cache 前缀）
   * @returns 删除的缓存数量
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      const redis = getRedis();
      const pattern = cacheKey(`${prefix}*`);
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`[RedisCache] Error deleting prefix "${prefix}":`, error);
      return 0;
    }
  }

  /**
   * 清空所有应用缓存
   * @returns 删除的缓存数量
   */
  async clear(): Promise<number> {
    try {
      const redis = getRedis();
      const pattern = cacheKey("*");
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error("[RedisCache] Error clearing cache:", error);
      return 0;
    }
  }

  /**
   * 获取或设置缓存
   * @param key - 缓存键（不带前缀）
   * @param fetchFn - 缓存未命中时的数据获取函数
   * @param ttl - 过期时间（秒）
   * @returns 缓存的数据或新获取的数据
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 缓存未命中，调用 fetchFn 获取数据
    const data = await fetchFn();

    // 3. 存入缓存
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存数量统计
   */
  async getStats(): Promise<{ total: number; keys: string[] }> {
    try {
      const redis = getRedis();
      const pattern = cacheKey("*");
      const keys = await redis.keys(pattern);
      return {
        total: keys.length,
        keys,
      };
    } catch (error) {
      console.error("[RedisCache] Error getting stats:", error);
      return { total: 0, keys: [] };
    }
  }

  /**
   * 检查缓存是否存在
   * @param key - 缓存键（不带前缀）
   */
  async has(key: string): Promise<boolean> {
    try {
      const redis = getRedis();
      const exists = await redis.exists(cacheKey(key));
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * 设置缓存（如果不存在）
   * @param key - 缓存键
   * @param value - 要缓存的数据
   * @param ttl - 过期时间（秒）
   * @returns 是否设置成功（true = 设置了，false = 已存在）
   */
  async setIfAbsent(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      const redis = getRedis();
      const result = await redis.set(
        cacheKey(key),
        JSON.stringify(value),
        "EX", // 设置过期时间
        ttl,
        "NX" // 只在键不存在时设置
      );
      return result === "OK";
    } catch {
      return false;
    }
  }
}

// 导出单例实例
export const redisCache = new RedisCache();
