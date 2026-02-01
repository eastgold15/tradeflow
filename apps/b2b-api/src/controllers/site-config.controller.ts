import { Elysia, t } from "elysia";
import { dbPlugin } from "~/db/connection";
import { authGuardMid } from "~/middleware/auth";

import { SiteConfigService } from "../services/site-config.service";
import { SiteConfigContract } from "@repo/contract";

const siteConfigService = new SiteConfigService();

export const siteConfigController = new Elysia({ prefix: "/site-config" })
  .use(dbPlugin)
  .use(authGuardMid)
  .get(
    "/",
    ({ query, user, db, currentDeptId }) =>
      siteConfigService.list(query, { db, user, currentDeptId }),
    {
      allPermissions: ["SITE_CONFIG_VIEW"],
      query: SiteConfigContract.ListQuery,
      requireDept: true,
      detail: {
        summary: "获取SiteConfig列表",
        description: "分页查询SiteConfig数据，支持搜索和排序",
        tags: ["SiteConfig"],
      },
    }
  )
  .get(
    "/keys",
    ({ user, db, currentDeptId }) =>
      siteConfigService.getKeys({ db, user, currentDeptId }),
    {
      allPermissions: ["SITE_CONFIG_VIEW"],
      requireDept: true,
      detail: {
        summary: "获取所有配置键及数量",
        description: "获取数据库中已存在的配置键列表及其使用数量",
        tags: ["SiteConfig"],
      },
      response: SiteConfigContract.KeysResponse,
    }
  )
  .post(
    "/",
    ({ body, user, db, currentDeptId }) =>
      siteConfigService.create(body, { db, user, currentDeptId }),
    {
      allPermissions: ["SITE_CONFIG_CREATE"],
      body: SiteConfigContract.Create,
      requireDept: true,
      detail: {
        summary: "创建SiteConfig",
        description: "新增一条SiteConfig记录",
        tags: ["SiteConfig"],
      },
    }
  )
  .put(
    "/:id",
    ({ params, body, user, db, currentDeptId }) =>
      siteConfigService.update(params.id, body, { db, user, currentDeptId }),
    {
      params: t.Object({ id: t.String() }),
      body: SiteConfigContract.Update,
      requireDept: true,
      allPermissions: ["SITE_CONFIG_EDIT"],
      detail: {
        summary: "更新SiteConfig",
        description: "根据ID更新SiteConfig信息",
        tags: ["SiteConfig"],
      },
    }
  )
  .delete(
    "/:id",
    ({ params, user, db, currentDeptId }) =>
      siteConfigService.delete(params.id, { db, user, currentDeptId }),
    {
      params: t.Object({ id: t.String() }),
      allPermissions: ["SITE_CONFIG_DELETE"],
      requireDept: true,
      detail: {
        summary: "删除SiteConfig",
        description: "根据ID删除SiteConfig记录",
        tags: ["SiteConfig"],
      },
    }
  );
