/**
 * 🤖 【Web Controller - 自动生成基类】
 * --------------------------------------------------------
 * ⚠️ 请勿手动修改此文件，下次运行会被覆盖。
 * 💡 请前往 ../_custom 目录修改具体的业务契约。
 * --------------------------------------------------------
 */

import { SeoConfigContract } from "@repo/contract";
import { Elysia } from "elysia";
import { dbPlugin } from "~/db/connection";
import { siteMiddleware } from "~/middleware/site";
import { seoConfigService } from "~/service";

export const seoconfigController = new Elysia({ prefix: "/seoconfig" })
  .use(dbPlugin)
  .use(siteMiddleware)
  .get(
    "/",
    ({ query, db, site }) => seoConfigService.list(query, { db, site }),
    { query: SeoConfigContract.ListQuery }
  );
