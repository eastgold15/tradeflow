import {
  mediaTable,
  productMediaTable,
  productTable,
  siteProductSiteCategoryTable,
  siteProductTable,
  siteSkuTable,
  skuTable,
} from "@repo/contract";
import { and, desc, eq, min, sql } from "drizzle-orm";
import type { ServiceContext } from "~/middleware/site";

/**
 * 🛠️ Category 业务实现
 */
export class SiteCategoryService {
  /**
   * 获取站点分类树（支持无限层级）
   */
  async tree(ctx: ServiceContext) {
    // 获取所有分类（扁平列表），按 sortOrder 排序
    const allCategories = await ctx.db.query.siteCategoryTable.findMany({
      where: {
        siteId: ctx.site.id,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    // 在内存中构建树形结构
    const categoryMap = new Map();
    const rootCategories = [];

    // 先将所有分类存入 map
    for (const category of allCategories) {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    }

    // 构建父子关系
    for (const category of allCategories) {
      const node = categoryMap.get(category.id);
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    }

    return rootCategories;
  }

  async getProductsByCategoryId(
    ctx: ServiceContext,
    id: string,
    query: { page: number; limit: number }
  ) {
    const { page = 1, limit = 10 } = query;

    const siteCategoryName = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        siteId: ctx.site.id,
        id,
      },
      columns: {
        name: true,
      },
    });

    console.log("siteCategoryName:", siteCategoryName);
    // 特殊处理：如果分类ID是 "new"，返回最近更新的商品
    if (siteCategoryName?.name?.toUpperCase() === "NEW") {
      console.log(
        'siteCategoryName?.name?.toUpperCase() === "NEW":',
        siteCategoryName?.name?.toUpperCase() === "NEW"
      );
      const flatProducts = await ctx.db
        .select({
          id: siteProductTable.id, // 返回站点商品ID，用于跳转到商品详情
          displayName: sql<string>`COALESCE(${siteProductTable.siteName}, ${productTable.name})`,
          displayDesc: sql<string>`COALESCE(${siteProductTable.siteDescription}, ${productTable.description})`,

          // 🔥 核心图片逻辑：从中间表关联查询第一张图
          mainMedia: sql<string>`(
            SELECT ${mediaTable.url}
            FROM ${productMediaTable}
            INNER JOIN ${mediaTable} ON ${mediaTable.id} = ${productMediaTable.mediaId}
            WHERE ${productMediaTable.productId} = ${productTable.id}
            ORDER BY ${productMediaTable.sortOrder} ASC
            LIMIT 1
          )`,

          minPrice: min(
            sql`COALESCE(${siteSkuTable.price}, ${skuTable.price})`
          ).as("min_price"),

          spuCode: productTable.spuCode,
          isFeatured: siteProductTable.isFeatured,
        })
        .from(siteProductTable)
        .innerJoin(
          productTable,
          eq(siteProductTable.productId, productTable.id)
        )
        // 必须连接 sku 表，minPrice 才能算出来
        .innerJoin(skuTable, eq(skuTable.productId, productTable.id))
        .leftJoin(
          siteSkuTable,
          and(
            eq(siteSkuTable.skuId, skuTable.id),
            eq(siteSkuTable.siteId, ctx.site.id)
          )
        )
        .where(
          and(
            eq(siteProductTable.siteId, ctx.site.id),
            eq(siteProductTable.isVisible, true)
          )
        )
        .groupBy(siteProductTable.id, productTable.id)
        .orderBy(desc(productTable.updatedAt))
        .limit(limit)
        .offset((page - 1) * limit);
      return flatProducts;
    }

    // 正常分类商品查询
    const flatProducts = await ctx.db
      .select({
        id: siteProductTable.id, // 返回站点商品ID，用于跳转到商品详情
        displayName: sql<string>`COALESCE(${siteProductTable.siteName}, ${productTable.name})`,
        displayDesc: sql<string>`COALESCE(${siteProductTable.siteDescription}, ${productTable.description})`,

        // 🔥 核心图片逻辑：从中间表关联查询第一张图
        mainMedia: sql<string>`(
          SELECT ${mediaTable.url}
          FROM ${productMediaTable}
          INNER JOIN ${mediaTable} ON ${mediaTable.id} = ${productMediaTable.mediaId}
          WHERE ${productMediaTable.productId} = ${productTable.id}
          ORDER BY ${productMediaTable.sortOrder} ASC
          LIMIT 1
        )`,

        minPrice: min(
          sql`COALESCE(${siteSkuTable.price}, ${skuTable.price})`
        ).as("min_price"),

        spuCode: productTable.spuCode,
        isFeatured: siteProductTable.isFeatured,
      })
      .from(siteProductSiteCategoryTable)
      .innerJoin(
        siteProductTable,
        eq(siteProductSiteCategoryTable.siteProductId, siteProductTable.id)
      )
      .innerJoin(productTable, eq(siteProductTable.productId, productTable.id))
      // 必须连接 sku 表，minPrice 才能算出来
      .innerJoin(skuTable, eq(skuTable.productId, productTable.id))
      .leftJoin(
        siteSkuTable,
        and(
          eq(siteSkuTable.skuId, skuTable.id),
          eq(siteSkuTable.siteId, ctx.site.id)
        )
      )
      .where(
        and(
          eq(siteProductSiteCategoryTable.siteCategoryId, id),
          eq(siteProductTable.siteId, ctx.site.id),
          eq(siteProductTable.isVisible, true)
        )
      )
      .groupBy(siteProductTable.id, productTable.id)
      // 🔥 添加排序：按商品的排序字段排序
      .orderBy(
        siteProductTable.sortOrder,
        productTable.createdAt
      )
      .limit(limit)
      .offset((page - 1) * limit);
    return flatProducts;
  }

  /**
   * 获取单个分类 (带站点检查)
   */
  async getById(id: string, ctx: ServiceContext) {
    const res = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        id,
        siteId: ctx.site.id,
      },
    });
    return res;
  }
}
