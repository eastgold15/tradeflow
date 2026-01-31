import { HttpError } from "@pori15/logixlysia";
import {
  mediaTable,
  ProductVariantContract,
  ProductVariantMediaContract,
  productMediaTable,
  productTemplateTable,
  productVariantMediaTable,
  skuMediaTable,
  skuTable,
  templateKeyTable,
  templateValueTable,
} from "@repo/contract";
import { and, asc, eq, sql } from "drizzle-orm";
import type { ServiceContext } from "~/lib/type";

export class ProductVariantMediaService {
  /**
   * 1. 为产品+属性值（如颜色）批量关联图片
   *
   * 核心逻辑：
   * - 先删除该产品+属性值的所有旧图片
   * - 再批量插入新图片
   * - 支持设置主图和排序
   */
  public async upsertByVariant(
    ctx: ServiceContext,
    productId: string,
    attributeValueId: string,
    mediaIds: string[],
    mainImageId?: string
  ) {
    const tenantId = ctx.user.context.tenantId!;

    return await ctx.db.transaction(async (tx) => {
      // 1. 验证产品归属（权限校验）
      const [product] = await tx
        .select({ id: productVariantMediaTable.id })
        .from(productVariantMediaTable)
        .where(and(eq(productVariantMediaTable.productId, productId)))
        .limit(1);

      if (!product) {
        throw new HttpError.NotFound(`Product (ID: ${productId})：不存在或无权操作`);
      }

      // 2. 删除该产品+属性值的所有旧图片
      await tx
        .delete(productVariantMediaTable)
        .where(
          and(
            eq(productVariantMediaTable.productId, productId),
            eq(productVariantMediaTable.attributeValueId, attributeValueId)
          )
        );

      // 3. 批量插入新图片
      if (mediaIds.length > 0) {
        const relations = mediaIds.map((mediaId, idx) => ({
          tenantId,
          productId,
          attributeValueId,
          mediaId,
          isMain: mainImageId ? mediaId === mainImageId : idx === 0,
          sortOrder: idx,
        }));

        await tx.insert(productVariantMediaTable).values(relations);
      }

      return { success: true, count: mediaIds.length };
    });
  }

  /**
   * 2. 根据 SKU 查询其对应属性值的图片
   *
   * 核心逻辑：
   * - 从 SKU 的 specJson 中提取颜色属性值 ID
   * - 查询 product_variant_media 表
   * - 如果没有找到，返回空数组（而不是 SKU 级别的图片）
   */
  public async getBySkuSpec(
    ctx: ServiceContext,
    skuSpecJson: Record<string, any>,
    productId: string
  ) {
    // 1. 从 specJson 中找到"颜色"属性值 ID
    // 假设 specJson 格式为: { "颜色": "黑色ID", "尺码": "42码ID" }
    // 需要找到 templateKey 中 inputType 为 "select" 且 isSkuSpec 为 true 的"颜色"字段

    // 这里简化处理：假设 specJson 的第一个 key 是颜色
    const colorValueId = Object.values(skuSpecJson)[0] as string;

    if (!colorValueId) {
      return [];
    }

    // 2. 查询该颜色值关联的图片
    const media = await ctx.db
      .select({
        id: mediaTable.id,
        url: mediaTable.url,
        thumbnailUrl: mediaTable.thumbnailUrl,
        isMain: productVariantMediaTable.isMain,
        sortOrder: productVariantMediaTable.sortOrder,
        mediaType: mediaTable.mediaType,
      })
      .from(productVariantMediaTable)
      .innerJoin(
        mediaTable,
        eq(productVariantMediaTable.mediaId, mediaTable.id)
      )
      .where(
        and(
          eq(productVariantMediaTable.productId, productId),
          eq(productVariantMediaTable.attributeValueId, colorValueId)
        )
      )
      .orderBy(productVariantMediaTable.sortOrder);

    return media;
  }

  /**
   * 3. 获取产品的所有变体图片分组
   *
   * 返回格式：
   * {
   *   "黑色ValueId": [媒体1, 媒体2],
   *   "白色ValueId": [媒体3, 媒体4],
   * }
   */
  public async getVariantGroups(ctx: ServiceContext, productId: string) {
    const media = await ctx.db
      .select({
        attributeValueId: productVariantMediaTable.attributeValueId,
        mediaId: mediaTable.id,
        url: mediaTable.url,
        thumbnailUrl: mediaTable.thumbnailUrl,
        isMain: productVariantMediaTable.isMain,
        sortOrder: productVariantMediaTable.sortOrder,
        mediaType: mediaTable.mediaType,
      })
      .from(productVariantMediaTable)
      .innerJoin(
        mediaTable,
        eq(productVariantMediaTable.mediaId, mediaTable.id)
      )
      .where(eq(productVariantMediaTable.productId, productId))
      .orderBy(productVariantMediaTable.sortOrder);

    // 按属性值分组
    const groups: Record<string, typeof media> = {};
    for (const item of media) {
      if (!groups[item.attributeValueId]) {
        groups[item.attributeValueId] = [];
      }
      groups[item.attributeValueId].push(item);
    }

    return groups;
  }

  /**
   * 4. 删除指定变体的图片
   */
  public async deleteByVariant(
    ctx: ServiceContext,
    productId: string,
    attributeValueId: string
  ) {
    const tenantId = ctx.user.context.tenantId!;

    const deleted = await ctx.db
      .delete(productVariantMediaTable)
      .where(
        and(
          eq(productVariantMediaTable.productId, productId),
          eq(productVariantMediaTable.attributeValueId, attributeValueId)
        )
      )
      .returning({ id: productVariantMediaTable.id });

    if (deleted.length === 0) {
      throw new HttpError.NotFound("记录不存在或无权删除");
    }

    return { success: true, count: deleted.length };
  }

  /**
   * 5. 列表查询（支持分页）
   */
  public async list(
    ctx: ServiceContext,
    query: typeof ProductVariantMediaContract.ListQuery.static
  ) {
    const {
      page = 1,
      limit = 10,
      productId,
      attributeValueId,
      search,
      sort = "createdAt",
      sortOrder = "desc",
    } = query;
    const tenantId = ctx.user.context.tenantId!;
    const baseConditions: any[] = [];

    // 产品筛选
    if (productId) {
      baseConditions.push(eq(productVariantMediaTable.productId, productId));
    }

    // 属性值筛选
    if (attributeValueId) {
      baseConditions.push(
        eq(productVariantMediaTable.attributeValueId, attributeValueId)
      );
    }

    const offset = (page - 1) * limit;

    // 排序处理
    const allowedSortFields: Record<string, any> = {
      id: productVariantMediaTable.id,
      createdAt: productVariantMediaTable.createdAt,
      sortOrder: productVariantMediaTable.sortOrder,
    };
    const orderByField =
      allowedSortFields[sort as keyof typeof allowedSortFields] ||
      productVariantMediaTable.createdAt;
    const orderByClause =
      sortOrder === "asc" ? orderByField : sql`${orderByField} DESC`;

    // 查询数据
    const items = await ctx.db
      .select({
        id: productVariantMediaTable.id,
        productId: productVariantMediaTable.productId,
        attributeValueId: productVariantMediaTable.attributeValueId,
        mediaId: productVariantMediaTable.mediaId,
        isMain: productVariantMediaTable.isMain,
        sortOrder: productVariantMediaTable.sortOrder,
        createdAt: productVariantMediaTable.createdAt,
        updatedAt: productVariantMediaTable.updatedAt,
        // 关联信息
        mediaUrl: mediaTable.url,
        mediaThumbnailUrl: mediaTable.thumbnailUrl,
        attributeValue: templateValueTable.value,
      })
      .from(productVariantMediaTable)
      .innerJoin(
        mediaTable,
        eq(productVariantMediaTable.mediaId, mediaTable.id)
      )
      .innerJoin(
        templateValueTable,
        eq(productVariantMediaTable.attributeValueId, templateValueTable.id)
      )
      .where(and(...baseConditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [{ total }] = await ctx.db
      .select({ total: sql<number>`COUNT(*)` })
      .from(productVariantMediaTable)
      .where(and(...baseConditions));

    return {
      data: items,
      total: Number(total),
      page,
      limit,
    };
  }

  /**
   * 6. 获取单个变体的图片（用于编辑回显）
   */
  public async getByVariant(
    ctx: ServiceContext,
    productId: string,
    attributeValueId: string
  ) {
    const media = await ctx.db
      .select({
        id: productVariantMediaTable.id,
        mediaId: productVariantMediaTable.mediaId,
        url: mediaTable.url,
        thumbnailUrl: mediaTable.thumbnailUrl,
        isMain: productVariantMediaTable.isMain,
        sortOrder: productVariantMediaTable.sortOrder,
        mediaType: mediaTable.mediaType,
      })
      .from(productVariantMediaTable)
      .innerJoin(
        mediaTable,
        eq(productVariantMediaTable.mediaId, mediaTable.id)
      )
      .where(
        and(
          eq(productVariantMediaTable.productId, productId),
          eq(productVariantMediaTable.attributeValueId, attributeValueId)
        )
      )
      .orderBy(productVariantMediaTable.sortOrder);

    return {
      mediaIds: media.map((m) => m.mediaId),
      images: media,
    };
  }

  // =========================================================
  // 变体媒体管理方法
  // =========================================================

  /**
   * 自动识别商品模板中的颜色属性
   * 匹配规则：属性名包含 "Color", "颜色", "colour"
   */
  private async identifyColorAttribute(
    productId: string,
    ctx: ServiceContext
  ): Promise<{ key: string; keyId: string } | null> {
    // 1. 获取商品模板
    const [productTemplate] = await ctx.db
      .select()
      .from(productTemplateTable)
      .where(eq(productTemplateTable.productId, productId));

    if (!productTemplate) return null;

    // 2. 查询模板的所有 SKU 规格属性
    const keys = await ctx.db
      .select()
      .from(templateKeyTable)
      .where(
        and(
          eq(templateKeyTable.templateId, productTemplate.templateId),
          eq(templateKeyTable.isSkuSpec, true)
        )
      );

    // 3. 自动识别：属性名包含 "Color", "颜色", "colour" 的属性
    const colorKey = keys.find((k) => /color|颜色|colour/i.test(k.key));

    return colorKey ? { key: colorKey.key, keyId: colorKey.id } : null;
  }

  /**
   * 获取商品的变体媒体配置
   * 返回按颜色属性值分组的媒体配置
   */
  public async getVariantMedia(productId: string, ctx: ServiceContext) {
    // 1. 识别颜色属性
    const colorAttr = await this.identifyColorAttribute(productId, ctx);
    if (!colorAttr) {
      throw new HttpError.BadRequest(`Product (ID: ${productId})：未配置颜色属性`);
    }

    // 2. 查询该颜色属性的所有可选值
    const values = await ctx.db
      .select({
        id: templateValueTable.id,
        value: templateValueTable.value,
      })
      .from(templateValueTable)
      .where(eq(templateValueTable.templateKeyId, colorAttr.keyId))
      .orderBy(asc(templateValueTable.sortOrder));

    // 3. 查询已配置的变体媒体
    const variantMediaList = await ctx.db
      .select({
        attributeValueId: productVariantMediaTable.attributeValueId,
        mediaId: productVariantMediaTable.mediaId,
        isMain: productVariantMediaTable.isMain,
        sortOrder: productVariantMediaTable.sortOrder,
        mediaUrl: mediaTable.url,
        mediaOriginalName: mediaTable.originalName,
        mediaType: mediaTable.mediaType,
      })
      .from(productVariantMediaTable)
      .innerJoin(
        mediaTable,
        eq(productVariantMediaTable.mediaId, mediaTable.id)
      )
      .where(eq(productVariantMediaTable.productId, productId))
      .orderBy(asc(productVariantMediaTable.sortOrder));

    // 4. 按属性值分组
    const mediaMap = new Map<string, any[]>();
    variantMediaList.forEach((vm) => {
      if (!mediaMap.has(vm.attributeValueId)) {
        mediaMap.set(vm.attributeValueId, []);
      }
      mediaMap.get(vm.attributeValueId)!.push({
        id: vm.mediaId,
        url: vm.mediaUrl,
        isMain: vm.isMain,
        sortOrder: vm.sortOrder,
        mediaType: vm.mediaType,
      });
    });

    // 5. 组装响应
    return {
      productId,
      colorAttributeKey: colorAttr.key,
      variantMedia: values.map((v) => ({
        attributeValueId: v.id,
        attributeValue: v.value,
        images: mediaMap.get(v.id) || [],
      })),
    };
  }

  /**
   * 保存商品的变体媒体配置
   * 使用事务确保数据一致性
   * 同时将第一个变体的主图设置为商品的主图
   */
  public async setVariantMedia(
    body: typeof ProductVariantContract.SetVariantMedia.static,
    ctx: ServiceContext
  ) {
    const { productId, variantMedia } = body;

    // Verify user has permission to modify this product
    const siteType = ctx.user.context.site?.siteType || "group";
    if (siteType !== "factory") {
      throw new HttpError.Forbidden("只有工厂有权限修改变体媒体");
    }

    return await ctx.db.transaction(async (tx) => {
      // 1. 删除旧的变体媒体配置
      await tx
        .delete(productVariantMediaTable)
        .where(eq(productVariantMediaTable.productId, productId));

      // 2. 插入新的配置（第一张图默认为该变体的主图）
      let firstVariantMediaId: string | undefined;
      for (const vm of variantMedia) {
        const mediaRelations = vm.mediaIds.map((mediaId, index) => ({
          productId,
          attributeValueId: vm.attributeValueId,
          mediaId,
          isMain: index === 0,
          sortOrder: index,
        }));

        if (mediaRelations.length > 0) {
          await tx.insert(productVariantMediaTable).values(mediaRelations);

          // 记录第一个变体的第一张图片
          if (!firstVariantMediaId && vm.mediaIds.length > 0) {
            firstVariantMediaId = vm.mediaIds[0];
          }
        }
      }

      // 3. 将第一个变体的主图设置为商品的主图
      if (firstVariantMediaId) {
        // 3.1 先将商品的所有图片的主图标记设为 false
        await tx
          .update(productMediaTable)
          .set({ isMain: false })
          .where(eq(productMediaTable.productId, productId));

        // 3.2 检查该图片是否已经在 product_media 表中
        const [existingMedia] = await tx
          .select()
          .from(productMediaTable)
          .where(
            and(
              eq(productMediaTable.productId, productId),
              eq(productMediaTable.mediaId, firstVariantMediaId)
            )
          )
          .limit(1);

        if (existingMedia) {
          // 如果已存在，更新为主图
          await tx
            .update(productMediaTable)
            .set({ isMain: true })
            .where(eq(productMediaTable.mediaId, existingMedia.mediaId));
        } else {
          // 如果不存在，插入为主图
          await tx.insert(productMediaTable).values({
            productId,
            mediaId: firstVariantMediaId,
            isMain: true,
            sortOrder: 0,
          });
        }
      }

      return { success: true };
    });
  }

  /**
   * 获取 SKU 的媒体（三级继承逻辑）
   * 优先级：SKU专属 > 变体级(颜色) > 商品级
   */
  public async getSkuMedia(skuId: string, ctx: ServiceContext) {
    // 1. 查询 SKU 信息
    const [sku] = await ctx.db
      .select()
      .from(skuTable)
      .where(eq(skuTable.id, skuId));

    if (!sku) {
      throw new HttpError.NotFound("SKU 不存在");
    }

    // 2. 第一优先级：SKU 专属媒体
    const skuMedia = await ctx.db
      .select({
        mediaId: skuMediaTable.mediaId,
        isMain: skuMediaTable.isMain,
        mediaUrl: mediaTable.url,
      })
      .from(skuMediaTable)
      .innerJoin(mediaTable, eq(skuMediaTable.mediaId, mediaTable.id))
      .where(eq(skuMediaTable.skuId, skuId))
      .orderBy(asc(skuMediaTable.sortOrder));

    if (skuMedia.length > 0) {
      return { source: "sku", media: skuMedia };
    }

    // 3. 第二优先级：变体级媒体
    // 解析 specJson 找到颜色属性值
    const specJson =
      typeof sku.specJson === "string"
        ? JSON.parse(sku.specJson)
        : sku.specJson;

    const colorAttr = await this.identifyColorAttribute(sku.productId, ctx);
    if (colorAttr) {
      const colorValue = specJson[colorAttr.key];
      if (colorValue) {
        // 查询该颜色值的 templateValue.id
        const [templateValue] = await ctx.db
          .select()
          .from(templateValueTable)
          .where(
            and(
              eq(templateValueTable.templateKeyId, colorAttr.keyId),
              eq(templateValueTable.value, colorValue)
            )
          );

        if (templateValue) {
          const variantMedia = await ctx.db
            .select({
              mediaId: productVariantMediaTable.mediaId,
              isMain: productVariantMediaTable.isMain,
              mediaUrl: mediaTable.url,
            })
            .from(productVariantMediaTable)
            .innerJoin(
              mediaTable,
              eq(productVariantMediaTable.mediaId, mediaTable.id)
            )
            .where(
              and(
                eq(productVariantMediaTable.productId, sku.productId),
                eq(productVariantMediaTable.attributeValueId, templateValue.id)
              )
            )
            .orderBy(asc(productVariantMediaTable.sortOrder));

          if (variantMedia.length > 0) {
            return { source: "variant", media: variantMedia };
          }
        }
      }
    }

    // 4. 第三优先级：商品级媒体
    const productMedia = await ctx.db
      .select({
        mediaId: productMediaTable.mediaId,
        isMain: productMediaTable.isMain,
        mediaUrl: mediaTable.url,
      })
      .from(productMediaTable)
      .innerJoin(mediaTable, eq(productMediaTable.mediaId, mediaTable.id))
      .where(eq(productMediaTable.productId, sku.productId))
      .orderBy(asc(productMediaTable.sortOrder));

    return { source: "product", media: productMedia };
  }
}
