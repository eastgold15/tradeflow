import { t } from "elysia";
import { PaginationParams, SortParams } from "../helper/query-types.model";
import { type InferDTO, spread } from "../helper/utils";
import { productTable, siteProductTable } from "../table.schema";

import { ProductTemplateFields } from "./product-template.contract";

const autoFields = ["id", "createdAt", "updatedAt", "siteId"];

export const SiteProductInsertFields = spread(siteProductTable, "insert");

export const SiteProductFields = spread(siteProductTable, "select");
const ProductFields = spread(productTable, "select");
export const SiteProductContract = {
  Response: t.Object({
    ...SiteProductFields,
  }),

  /**
   * 创建/收录商品（支持两种模式）
   * - 模式A: 收录已有商品（集团站）- 只需提供 productId
   * - 模式B: 创建新商品（工厂）- 需要提供完整商品信息
   */
  Create: t.Object({
    spuCode: ProductFields.spuCode,
    siteName: ProductFields.name, // 站点商品名称，也是源头商品名称
    siteDescription: ProductFields.description, // 站点商品描述，也是源头商品描述
    slug: SiteProductInsertFields.slug, // SEO友好的URL别名

    productId: t.Optional(t.String()),
    status: t.Optional(ProductFields.status),
    templateId: ProductTemplateFields.templateId,
    siteCategoryId: t.String(),
    seoTitle: t.Optional(SiteProductInsertFields.seoTitle),

    // 商品媒体关联
    mediaIds: t.Optional(t.Array(t.String())), // 商品图片ID列表
    mainImageId: t.Optional(t.String()), // 主图ID
    videoIds: t.Optional(t.Array(t.String())), // 视频ID列表
    // 商品独有属性（简单键值对）
    customAttributes: t.Optional(t.Record(t.String(), t.String())),
  }),

  Update: t.Partial(
    t.Object({
      siteName: SiteProductInsertFields.siteName,
      siteDescription: SiteProductInsertFields.siteDescription,
      spuCode: ProductFields.spuCode,
      slug: SiteProductInsertFields.slug, // SEO友好的URL别名
      status: ProductFields.status,

      templateId: ProductTemplateFields.templateId,
      seoTitle: SiteProductInsertFields.seoTitle,
      siteCategoryId: t.Optional(t.String()),
      // 商品媒体关联
      mediaIds: t.Optional(t.Array(t.String())), // 商品图片ID列表
      mainImageId: t.Optional(t.String()), // 主图ID
      videoIds: t.Optional(t.Array(t.String())), // 视频ID列表
      customAttributes: t.Optional(t.Record(t.String(), t.String())),
      name: ProductFields.name,
      description: ProductFields.description,
    })
  ),

  ListQuery: t.Object({
    ...t.Partial(t.Object(SiteProductInsertFields)).properties,
    siteCategoryId: t.Optional(t.String()),
    ...PaginationParams.properties,
    ...SortParams.properties,
    isListed: t.Optional(t.Boolean()),
    search: t.Optional(t.String()),
  }),
  ListResponse: t.Object({
    data: t.Array(t.Object({ ...SiteProductFields })),
    total: t.Number(),
  }),

  // 批量更新排序
  BatchUpdateSortOrder: t.Object({
    items: t.Array(
      t.Object({
        siteProductId: t.String(),
        sortOrder: t.Number(),
      })
    ),
  }),
} as const;

export type SiteProductContract = InferDTO<typeof SiteProductContract>;

export const ProductInsertFields = spread(productTable, "insert");

export const ProductContract = {
  Response: t.Object({
    ...ProductFields,
  }),
  Patch: t.Partial(
    t.Object({
      ...t.Omit(t.Object(ProductInsertFields), [
        "id",
        "createdAt",
        "updatedAt",
        "siteId",
        "tenantId", // 不允许修改租户
        "deptId", // 不允许修改部门
        "createdBy", // 不允许修改创建者
      ]).properties,
      mediaIds: t.Optional(t.Array(t.String())),
      mainImageId: t.Optional(t.String()),
      videoIds: t.Optional(t.Array(t.String())),
      // 商品独有属性（简单键值对）
      customAttributes: t.Optional(t.Record(t.String(), t.String())),
    })
  ),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  ListQuery: t.Object({
    ...t.Partial(t.Object(ProductInsertFields)).properties,
    ...PaginationParams.properties,
    ...SortParams.properties,
    search: t.Optional(t.String()),
    categoryId: t.Optional(t.String()),
  }),
} as const;

export type ProductContract = InferDTO<typeof ProductContract>;
