import { db } from "~/db/connection";





/**
 * 📥 获取站点商品及其完整产品关系（用于询盘、详情页等）
 */
export async function findSiteProductWithRelations(siteId: string, siteProductId: string) {
  return await db.query.siteProductTable.findFirst({
    where: { id: siteProductId, siteId },
    with: {
      product: {
        with: {
          media: true,
          variantMedia: {
            with: {
              media: true,
              attributeValue: true,
            },
          },
        },
      },
    },
  });
}

/**
 * 🧩 类型：带完整关系的 SiteProduct
 */
export type SiteProductWithRelations = NonNullable<
  Awaited<ReturnType<typeof findSiteProductWithRelations>>
>;



/**
 * 📥 获取站点 SKU 及其关联的 SKU 媒体
 */
export async function findSiteSkuWithRelations(siteProductId: string, siteSkuId: string) {
  return await db.query.siteSkuTable.findFirst({
    where: { id: siteSkuId, siteProductId },
    with: {
      sku: {
        with: {
          media: true,
        },
      },
    },
  });
}

// =============================================================================
// 🧾 自动类型导出（零维护！）
// ⚠️ 这些类型会随查询结构自动更新
// =============================================================================



/**
 * 🧩 类型：带媒体的 SiteSku
 */
export type SiteSkuWithRelations = NonNullable<
  Awaited<ReturnType<typeof findSiteSkuWithRelations>>
>;