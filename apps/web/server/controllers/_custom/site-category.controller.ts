import Elysia, { t } from "elysia";
import { dbPlugin } from "~/db/connection";
import { localeMiddleware } from "~/middleware/locale";
import { siteMiddleware } from "~/middleware/site";
import { siteCategoryService } from "~/service/index";

export const sitecategoriesController = new Elysia({
  prefix: "/site_category",
}) // 获取分类树形列表 - 前端用户使用
  .use(localeMiddleware)
  .use(dbPlugin)
  .use(siteMiddleware)
  .get(
    "/tree",
    ({ locale, db, site }) => {
      console.log("获取分类树形列表，当前语言:", locale, "站点ID:", site.id);
      // 调用 service 层的方法
      return siteCategoryService.tree({ db, site });
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "获取站点分类树",
        description: "获取当前站点的分类树形结构，用于商品分类导航和筛选",
      },
    }
  )
  .get(
    "/category/:id",
    async ({ params: { id }, db, query, site }) => {
      return await siteCategoryService.getProductsByCategoryId(
        {
          db,
          site,
        },
        id,
        query
      );
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        page: t.Number(),
        limit: t.Number(),
      }),
      detail: {
        tags: ["Products"],
        summary: "获取分类下的商品",
        description: "根据分类ID获取该分类下的所有商品",
      },
    }
  )
  .get(
    "/detail/:id",
    ({ params: { id }, db, site }) => {
      // 获取单个分类 - 前端用户使用
      return siteCategoryService.getById(id, { db, site });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Categories"],
        summary: "获取分类详情",
        description: "根据分类ID获取详细信息，包括名称、描述、父子关系等",
      },
    }
  );
