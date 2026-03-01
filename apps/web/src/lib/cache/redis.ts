/**
 * Redis 连接模块
 * 提供单例 Redis 客户端和缓存工具函数
 */

import Redis from 'ioredis';

// Redis 单例
let redis: Redis | null = null;

/**
 * 获取 Redis 客户端实例
 *
 * 优先使用 REDIS_URL 环境变量（如 Railway 提供的格式）
 * 格式: redis://[password@]host:port/[db]
 *       redis://default:xxx@switchyard.proxy.rlwy.net:21555
 */
export function getRedis(): Redis {
  if (!redis) {
    // 优先使用 REDIS_URL，否则使用单独的配置项
    const redisUrl = process.env.REDIS_URL!;


    // 使用 REDIS_URL（Railway 等平台提供的格式）
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      lazyConnect: false,
    });


    redis.on('error', (err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Redis] Error:', err);
      }
    });

    redis.on('connect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Redis] Connected');
      }
    });

    redis.on('close', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Redis] Connection closed');
      }
    });
  }
  return redis;
}

/**
 * 关闭 Redis 连接
 */
export function closeRedis(): void {
  if (redis) {
    redis.quit();
    redis = null;
  }
}

// 缓存键前缀
const CACHE_PREFIX = 'shop:cache:';

/**
 * 生成标准化的缓存键
 */
export function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * 缓存 TTL 配置（单位：秒）
 */
export const CACHE_TTL = {
  SITE_INFO: 60 * 60,          // 1小时 - 站点基本信息
  CATEGORY_TREE: 30 * 60,      // 30分钟 - 分类树结构
  PRODUCT_LIST: 10 * 60,       // 10分钟 - 产品列表（变化较快）
  SITE_CONFIG: 30 * 60,        // 30分钟 - 站点配置
  SEO_CONFIG: 30 * 60,         // 30分钟 - SEO 配置
} as const;

/**
 * 检查 Redis 连接健康状态
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
