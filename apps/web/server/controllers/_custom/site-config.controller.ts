import { SiteConfigContract } from "@repo/contract";
import Elysia from "elysia";
import { dbPlugin } from "~/db/connection";
import { siteMiddleware } from "~/middleware/site";
import { SiteConfigService } from "~/service/site-config.service";

const siteConfigService = new SiteConfigService();

export const siteConfigController = new Elysia({ prefix: "/site_config" })
  .use(dbPlugin)
  .use(siteMiddleware)
  .get(
    "/",
    ({ query, db, site }) => siteConfigService.list(query, { db, site }),
    {
      query: SiteConfigContract.ListQuery,
      detail: {
        summary: "获取SiteConfig列表",
        description: "分页查询SiteConfig数据，支持搜索和排序",
        tags: ["SiteConfig"],
      },
    }
  );
