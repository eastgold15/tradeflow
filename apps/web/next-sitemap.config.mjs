// next-sitemap.config.mjs
/** @type {import('next-sitemap').IConfig} */
const SITE_URL = process.env.DOMAIN
  ? `https://${process.env.DOMAIN.replace(/:\d+$/, '')}` // 移除端口号
  : 'https://dongqishoes.com';

export default {
  siteUrl: SITE_URL,

  // 生成 robots.txt
  generateRobotsTxt: true,

  // 默认配置
  changefreq: 'daily',
  priority: 0.7,

  // 排除的路径
  exclude: ['/api/**', '/ws/**', '/_next/**'],

  // robots.txt 配置
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/ws'],
      },
    ],
    // additionalSitemaps: [
    //   `${SITE_URL}/server-sitemap.xml`, // 动态 sitemap
    // ],
  },

  // 静态页面转换
  transform: async (config, path) => {
    // 首页最高优先级
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      };
    }

    // 产品页面
    if (path.startsWith('/product/')) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.9,
      };
    }

    // 分类页面
    if (path.startsWith('/category/')) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.8,
      };
    }

    // 默认配置
    return {
      loc: path,
      changefreq: 'monthly',
      priority: 0.5,
    };
  },
};
