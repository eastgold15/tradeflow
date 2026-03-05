/**
 * 为现有商品生成 slug
 * 运行方式: bun scripts/migrations/generate-product-slugs.ts
 */

import { productTable, siteProductTable } from "@repo/contract";
import { eq, isNull } from "drizzle-orm";
import { generateProductSlug } from "@/lib/slug-utils";
import { db } from "../../server/db/connection";

async function generateProductSlugs() {
  console.log("开始为现有商品生成 slug...");

  const products = await db
    .select({
      id: siteProductTable.id,
      siteName: siteProductTable.siteName,
      productId: siteProductTable.productId,
      productName: productTable.name,
    })
    .from(siteProductTable)
    .innerJoin(productTable, eq(siteProductTable.productId, productTable.id))
    .where(isNull(siteProductTable.slug));

  if (products.length === 0) {
    console.log("没有需要生成 slug 的商品");
    return;
  }

  console.log(`找到 ${products.length} 个需要生成 slug 的商品`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      const slug = generateProductSlug(
        product.siteName,
        product.productName,
        product.productId
      );

      await db
        .update(siteProductTable)
        .set({ slug })
        .where(eq(siteProductTable.id, product.id));

      console.log(`OK ${slug}`);
      successCount++;
    } catch (error) {
      console.error(`FAIL ${product.id}`, error);
      errorCount++;
    }
  }

  console.log(`Done: OK ${successCount}, FAIL ${errorCount}`);
}

generateProductSlugs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
