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
    "/category/:slug",
    async ({ params: { slug }, db, query, site }) => {
      return await siteCategoryService.getProductsByCategorySlug(
        {
          db,
          site,
        },
        slug,
        query
      );
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
      query: t.Object({
        page: t.Number(),
        limit: t.Number(),
      }),
      detail: {
        tags: ["Products"],
        summary: "根据分类 slug 获取商品",
        description: "根据分类的 slug 获取该分类下的所有商品",
      },
    }
  )
  .get(
    "/detail/:slug",
    ({ params: { slug }, db, site }) => {
      // 获取单个分类 - 通过 slug
      return siteCategoryService.getBySlug(slug, { db, site });
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
      detail: {
        tags: ["Categories"],
        summary: "根据 slug 获取分类详情",
        description: "根据分类的 slug 获取详细信息",
      },
    }
  );
