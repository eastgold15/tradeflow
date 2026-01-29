import { Elysia } from "elysia";

/**
 * 🤖 【路由挂载器 - 自动生成】
 * --------------------------------------------------------
 * 🛠️ 静态链式调用，保证 Eden Treaty 类型推断完美。
 * --------------------------------------------------------
 */

import { adsController } from "./_custom/ads.controller";
import { herocardsController } from "./_custom/herocards.controller";
import { inquiryController } from "./_custom/inquiry.controller";
import { mediaController } from "./_custom/media.controller";
import { newsletterController } from "./_custom/newsletter.controller";
import { sitecategoriesController } from "./_custom/site-category.controller";
import { siteConfigController } from "./_custom/site-config.controller";
import { siteProductsController } from "./_custom/site-products.controller";

export const appRouter = new Elysia({ name: "appRouter" })
  .use(adsController)
  .use(siteProductsController)
  .use(herocardsController)
  .use(mediaController)
  .use(sitecategoriesController)
  .use(inquiryController)
  .use(newsletterController)
  .use(siteConfigController);
