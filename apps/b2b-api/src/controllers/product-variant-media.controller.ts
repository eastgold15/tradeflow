import {
  ProductVariantContract,
  ProductVariantMediaContract,
} from "@repo/contract";
import { Elysia, t } from "elysia";
import { dbPlugin } from "~/db/connection";
import { authGuardMid } from "~/middleware/auth";
import { ProductVariantMediaService } from "../services/product-variant-media.service";

const productVariantMediaService = new ProductVariantMediaService();

/**
 * 变体媒体关联控制器
 *
 * 功能说明：
 * - 实现图片与属性值（如颜色）的绑定，而不是与具体 SKU 绑定
 * - 这样同一种颜色不同尺码的 SKU 可以共用同一组图片
 *
 * 路由组织：
 * - 基础 CRUD：/product-variant-media/*
 * - 向后兼容：/product-variant/*（从 ProductService 迁移）
 */
export const productVariantMediaController = new Elysia({
  prefix: "/product-variant-media",
  tags: ["Product Variant Media"],
})
  .use(dbPlugin)
  .use(authGuardMid)
  /**
   * 获取变体媒体列表
   */
  .get(
    "/list",
    ({ query, user, db, currentDeptId }) =>
      productVariantMediaService.list({ db, user, currentDeptId }, query),
    {
      allPermissions: ["PRODUCT_EDIT"],
      requireDept: true,
      query: ProductVariantMediaContract.ListQuery,
      detail: {
        summary: "获取变体媒体列表",
        description: "分页查询产品变体媒体关联数据，支持按产品和属性值筛选",
      },
    }
  )
  /**
   * 获取单个变体的图片（用于编辑回显）
   */
  .get(
    "/product/:productId/variant/:attributeValueId",
    ({ params, user, db, currentDeptId }) =>
      productVariantMediaService.getByVariant(
        { db, user, currentDeptId },
        params.productId,
        params.attributeValueId
      ),
    {
      params: t.Object({
        productId: t.String(),
        attributeValueId: t.String(),
      }),
      allPermissions: ["PRODUCT_EDIT"],
      requireDept: true,
      detail: {
        summary: "获取单个变体的图片",
        description: "获取指定产品和属性值的图片关联数据",
      },
    }
  )
  /**
   * 获取产品的所有变体图片分组
   */
  .get(
    "/product/:productId/groups",
    ({ params, user, db, currentDeptId }) =>
      productVariantMediaService.getVariantGroups(
        { db, user, currentDeptId },
        params.productId
      ),
    {
      params: t.Object({
        productId: t.String(),
      }),
      allPermissions: ["PRODUCT_VIEW"],
      requireDept: true,
      detail: {
        summary: "获取产品变体图片分组",
        description:
          "获取产品的所有变体图片分组，按属性值（如颜色）返回图片列表",
      },
    }
  )
  /**
   * 为产品+属性值批量关联图片（全量替换）
   */
  .post(
    "/product/:productId/variant/:attributeValueId/upsert",
    ({ params, body, user, db, currentDeptId }) =>
      productVariantMediaService.upsertByVariant(
        { db, user, currentDeptId },
        params.productId,
        params.attributeValueId,
        body.mediaIds,
        body.mainImageId
      ),
    {
      params: t.Object({
        productId: t.String(),
        attributeValueId: t.String(),
      }),
      body: t.Object({
        mediaIds: t.Array(t.String()),
        mainImageId: t.Optional(t.String()),
      }),
      allPermissions: ["PRODUCT_EDIT"],
      requireDept: true,
      detail: {
        summary: "为变体批量关联图片",
        description:
          "为指定产品和属性值批量关联图片，会先删除旧图片再插入新图片。支持设置主图和排序。",
      },
    }
  )
  /**
   * 删除指定变体的图片
   */
  .delete(
    "/product/:productId/variant/:attributeValueId",
    ({ params, user, db, currentDeptId }) =>
      productVariantMediaService.deleteByVariant(
        { db, user, currentDeptId },
        params.productId,
        params.attributeValueId
      ),
    {
      params: t.Object({
        productId: t.String(),
        attributeValueId: t.String(),
      }),
      allPermissions: ["PRODUCT_EDIT"],
      requireDept: true,
      detail: {
        summary: "删除变体图片",
        description: "删除指定产品和属性值的所有图片关联",
      },
    }
  );

/**
 * 变体媒体管理控制器（向后兼容路由）
 * 从 ProductService 迁移过来的功能，保持原有路由以兼容前端
 */
export const productVariantController = new Elysia({
  prefix: "/product-variant",
  tags: ["Product Variant"],
})
  .use(dbPlugin)
  .use(authGuardMid)
  /**
   * 获取商品变体媒体配置（自动识别颜色属性）
   * @deprecated 使用 GET /product-variant-media/product/:productId/groups 代替
   */
  .get(
    "/:productId",
    ({ params, user, db, currentDeptId }) =>
      productVariantMediaService.getVariantMedia(params.productId, {
        db,
        user,
        currentDeptId,
      }),
    {
      params: t.Object({
        productId: t.String(),
      }),
      allPermissions: ["PRODUCT_VIEW"],
      requireDept: true,
      detail: {
        summary: "获取商品变体媒体配置（已弃用）",
        description:
          "自动识别颜色属性并返回按颜色值分组的图片。建议使用 /product-variant-media/product/:productId/groups",
        deprecated: true,
      },
    }
  )
  /**
   * 保存商品变体媒体配置（批量设置）
   * @deprecated 使用 POST /product-variant-media/product/:productId/variant/:attributeValueId/upsert 代替
   */
  .post(
    "/",
    ({ body, user, db, currentDeptId }) =>
      productVariantMediaService.setVariantMedia(body, {
        db,
        user,
        currentDeptId,
      }),
    {
      body: ProductVariantContract.SetVariantMedia,
      allPermissions: ["PRODUCT_EDIT"],
      requireDept: true,
      detail: {
        summary: "保存商品变体媒体配置（已弃用）",
        description:
          "批量设置商品的变体媒体，会自动识别颜色属性。建议使用 /product-variant-media 的细粒度 API",
        deprecated: true,
      },
    }
  )
  /**
   * 获取 SKU 媒体（三级继承逻辑）
   */
  .get(
    "/sku/:skuId/media",
    ({ params, user, db, currentDeptId }) =>
      productVariantMediaService.getSkuMedia(params.skuId, {
        db,
        user,
        currentDeptId,
      }),
    {
      params: t.Object({
        skuId: t.String(),
      }),
      allPermissions: ["PRODUCT_VIEW"],
      requireDept: true,
      detail: {
        summary: "获取 SKU 媒体（继承逻辑）",
        description:
          "按 SKU专属 > 变体级(颜色) > 商品级 的优先级获取图片，返回媒体来源和图片列表",
      },
    }
  );
