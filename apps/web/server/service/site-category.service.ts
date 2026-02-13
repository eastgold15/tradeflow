import {
  mediaTable,
  productMediaTable,
  productTable,
  siteProductSiteCategoryTable,
  siteProductTable,
  siteSkuTable,
  skuTable,
} from "@repo/contract";
import { and, desc, eq, min, or, sql } from "drizzle-orm";
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

  /**
   * 根据 slug 获取分类详情
   */
  async getBySlug(slug: string, ctx: ServiceContext) {
    // 标准化 slug：确保有前导斜杠（数据库中存储的是 /new, /flats 等）
    const normalizedSlug = slug.startsWith('/') ? slug : '/' + slug;


    const res = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        slug: normalizedSlug,
        siteId: ctx.site.id,
      },
    });
    return res;
  }

  /**
   * 根据 slug 获取分类下的商品（支持子分类）
   */
  async getProductsByCategorySlug(
    ctx: ServiceContext,
    slug: string,
    query: { page: number; limit: number }
  ) {
    // 标准化 slug：确保有前导斜杠（数据库中存储的是 /new, /flats 等）
    const normalizedSlug = slug.startsWith('/') ? slug : '/' + slug;



    console.log('=== getProductsByCategorySlug 开始 ===');
    console.log('1. 原始 slug:', slug, '标准化后:', normalizedSlug);
    console.log('2. siteId:', ctx.site.id);

    if (normalizedSlug === '/news' || normalizedSlug === '/new') {
      console.log('>>> 检测到 /news，返回最新商品');
      const { page = 1, limit = 20 } = query;
      try {
        const latestProducts = await ctx.db
          .select({
            id: siteProductTable.id,
            displayName: sql<string>`COALESCE(${siteProductTable.siteName}, ${productTable.name})`,
            displayDesc: sql<string>`COALESCE(${siteProductTable.siteDescription}, ${productTable.description})`,
            mainMedia: sql<string>`(
            SELECT ${mediaTable.url}
            FROM ${productMediaTable}
            INNER JOIN ${mediaTable} ON ${mediaTable.id} = ${productMediaTable.mediaId}
            WHERE ${productMediaTable.productId} = ${productTable.id}
            ORDER BY ${productMediaTable.sortOrder} ASC
            LIMIT 1
          )`,
            minPrice: min(
              sql`COALESCE(${siteSkuTable.marketPrice}, ${skuTable.marketPrice})`
            ).as("min_price"),
            spuCode: productTable.spuCode,
            isFeatured: siteProductTable.isFeatured,
          })
          .from(siteProductTable)
          .innerJoin(productTable, eq(siteProductTable.productId, productTable.id))
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
          .orderBy(desc(productTable.createdAt)) // ⬅️ 按创建时间倒序
          .limit(limit)
          .offset((page - 1) * limit);

        return latestProducts;
      } catch (error) {
        console.error('❌ 查询最新商品时出错:', error);
        return [];
      }
    }


    // 先通过 slug 获取分类
    const category = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        slug: normalizedSlug,
        siteId: ctx.site.id,
      },
      with: {
        children: {
          with: {
            children: true, // 支持三级分类
          },
        },
      },
    });

    console.log('3. 查询到的分类:', category ? { id: category.id, name: category.name, slug: category.slug } : null);

    if (!category) {
      console.log('❌ 未找到分类，返回空数组');
      return [];
    }

    // 收集当前分类及所有子分类的ID
    const categoryIds = [category.id];
    const collectChildIds = (children: any[]) => {
      if (!children) return;
      for (const child of children) {
        categoryIds.push(child.id);
        if (child.children) {
          collectChildIds(child.children);
        }
      }
    };
    collectChildIds(category.children);

    console.log('4. 分类ID列表（包括子分类）:', categoryIds);

    const { page = 1, limit = 10 } = query;
    console.log('5. 分页参数:', { page, limit });

    try {
      // 构建多个 OR 条件来匹配分类ID
      const categoryConditions = categoryIds.map((id) =>
        eq(siteProductSiteCategoryTable.siteCategoryId, id)
      );

      const flatProducts = await ctx.db
        .select({
          id: siteProductTable.id,
          displayName: sql<string>`COALESCE(${siteProductTable.siteName}, ${productTable.name})`,
          displayDesc: sql<string>`COALESCE(${siteProductTable.siteDescription}, ${productTable.description})`,
          mainMedia: sql<string>`(
            SELECT ${mediaTable.url}
            FROM ${productMediaTable}
            INNER JOIN ${mediaTable} ON ${mediaTable.id} = ${productMediaTable.mediaId}
            WHERE ${productMediaTable.productId} = ${productTable.id}
            ORDER BY ${productMediaTable.sortOrder} ASC
            LIMIT 1
          )`,
          minPrice: min(
            sql`COALESCE(${siteSkuTable.marketPrice}, ${skuTable.marketPrice})`
          ).as("min_price"),
          spuCode: productTable.spuCode,
          isFeatured: siteProductTable.isFeatured,
        })
        .from(siteProductSiteCategoryTable)
        .innerJoin(siteProductTable, eq(siteProductSiteCategoryTable.siteProductId, siteProductTable.id))
        .innerJoin(productTable, eq(siteProductTable.productId, productTable.id))
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
            // 使用 or 来匹配任意一个分类ID
            or(...categoryConditions),
            eq(siteProductTable.siteId, ctx.site.id),
            eq(siteProductTable.isVisible, true)
          )
        )
        .groupBy(siteProductTable.id, productTable.id)
        .orderBy(siteProductTable.sortOrder, productTable.createdAt)
        .limit(limit)
        .offset((page - 1) * limit);

      console.log('6. 查询到的商品数量:', flatProducts.length);
      console.log('=== getProductsByCategorySlug 结束 ===');

      return flatProducts;
    } catch (error) {
      console.error('❌ 查询商品时出错:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      return [];
    }

  }
}
