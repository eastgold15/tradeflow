import { ProductContract } from "@repo/contract";
import { Elysia, t } from "elysia";
import { dbPlugin } from "~/db/connection";
import { localeMiddleware } from "~/middleware/locale";
import { siteMiddleware } from "~/middleware/site";
import { siteProductService } from "~/service/index";
import { buildPageMeta } from "~/utils/services/pagination";

export const siteProductsController = new Elysia({ prefix: "/site_products" })
  .use(localeMiddleware)
  .use(dbPlugin)
  .use(siteMiddleware)
  .get(
    "/",
    async ({ db, site, query }) => {
      const { page = 1, limit = 10 } = query;
      const { data, total } = await siteProductService.list(query, {
        db,
        site,
      });
      return {
        items: data,
        meta: buildPageMeta(total, page, limit),
      };
    },
    {
      query: ProductContract.ListQuery,
      detail: {
        tags: ["Site Products"],
        summary: "获取商品列表",
        description: "分页获取当前站点的商品列表，支持按分类、名称等条件筛选",
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, db, site }) =>
      await siteProductService.getDetail(id, { db, site }),
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Site Products"],
        summary: "获取商品详情",
        description: "根据商品ID获取详细的商品信息，包括价格、描述、图片等",
      },
    }
  )
  .get(
    "/slug/:slug",
    async ({ params: { slug }, db, site }) =>
      await siteProductService.getBySlug(slug, { db, site }),
    {
      params: t.Object({ slug: t.String() }),
      detail: {
        tags: ["Site Products"],
        summary: "根据 slug 获取商品详情",
        description: "用于前端 SEO 友好的商品详情页",
      },
    }
  );
