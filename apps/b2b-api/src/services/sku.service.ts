import { HttpError } from "@pori15/logixlysia";
import {
  mediaTable,
  productTable,
  SkuContract,
  siteProductTable,
  siteSkuTable,
  skuMediaTable,
  skuTable,
} from "@repo/contract";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { type ServiceContext } from "../lib/type";

export class SkuService {
  /**
   * 1. 批量创建 SKU (通常用于商品发布初始阶段)
   * 逻辑：检查重复 -> 批量写入SKU -> 批量写入图片关联
   */
  /**
   * 1. 批量创建 SKU (仅限工厂)
   * 逻辑：创建物理 SKU -> 建立图片关联 -> 自动为工厂站点创建 site_sku 记录
   */
  public async batchCreate(
    ctx: ServiceContext,
    productId: string,
    skus: SkuContract["BatchCreate"] // 假设你的 Contract 类型
  ) {
    const siteId = ctx.user.context.site?.id;
    const siteType = ctx.user.context.site?.siteType || "group";

    // 1. 权限硬校验：只有工厂能创建物理 SKU
    if (siteType !== "factory") {
      throw new HttpError.Forbidden("只有工厂有权限创建 SKU");
    }

    if (!skus || skus.length === 0) return [];

    return await ctx.db.transaction(async (tx) => {
      //  更新商品状态为可见
      tx.update(productTable)
        .set({
          status: 1,
        })
        .where(eq(productTable.id, productId));

      // 2. 获取 SiteProduct ID (为了关联 site_sku)
      const [siteProduct] = await tx
        .select({ id: siteProductTable.id })
        .from(siteProductTable)
        .where(
          and(
            eq(siteProductTable.productId, productId),
            eq(siteProductTable.siteId, siteId!)
          )
        )
        .limit(1);

      if (!siteProduct) throw new HttpError.NotFound(`SiteProduct (ProductID: ${productId})：请先在当前站点创建商品`);

      // 3. 检查 SKU 编码重复 (在当前商品下)
      const skuCodes = skus.map((s) => s.skuCode);
      const existingSkus = await tx
        .select({ skuCode: skuTable.skuCode })
        .from(skuTable)
        .where(
          and(
            eq(skuTable.productId, productId),
            inArray(skuTable.skuCode, skuCodes)
          )
        );

      if (existingSkus.length > 0) {
        throw new HttpError.Conflict(
          `SKU编码已存在: ${existingSkus.map((s) => s.skuCode).join(", ")}`
        );
      }

      // 4. 批量插入物理 SKU (skuTable)
      const createdSkus = await tx
        .insert(skuTable)
        .values(
          skus.map((sku) => ({
            productId,
            skuCode: sku.skuCode,
            price: sku.price, // 这是"出厂指导价"
            stock: sku.stock || "0",
            marketPrice: sku.marketPrice,
            costPrice: sku.costPrice,
            weight: sku.weight ? String(sku.weight) : "0.000",
            volume: sku.volume ? String(sku.volume) : "0.000",
            specJson: sku.specJson,
            status: 1,
            tenantId: ctx.user.context.tenantId!,
            deptId: ctx.currentDeptId,
            createdBy: ctx.user.id,
          }))
        )
        .returning();

      // 5. 自动为工厂创建 site_sku 记录 (让工厂能卖自己刚创建的 SKU)
      if (createdSkus.length > 0) {
        await tx.insert(siteSkuTable).values(
          createdSkus.map((sku) => ({
            siteId: siteId!,
            siteProductId: siteProduct.id,
            skuId: sku.id,
            price: sku.price, // 默认站点价格 = 指导价
            marketPrice: sku.marketPrice, // 默认站点市场价 = 市场价
            costPrice: sku.costPrice, // 默认站点成本价 = 成本价
            isActive: true,
          }))
        );
      }

      // 6. 处理图片关联
      const mediaRelations: any[] = [];
      for (let i = 0; i < createdSkus.length; i++) {
        const createdSku = createdSkus[i];
        const inputSku = skus[i]; // 假设顺序一致
        if (inputSku.mediaIds && inputSku.mediaIds.length > 0) {
          inputSku.mediaIds.forEach((mediaId, idx) => {
            mediaRelations.push({
              tenantId: ctx.user.context.tenantId!,
              skuId: createdSku.id,
              mediaId,
              isMain: idx === 0,
              sortOrder: idx,
            });
          });
        }
      }
      if (mediaRelations.length > 0) {
        await tx.insert(skuMediaTable).values(mediaRelations);
      }

      return createdSkus;
    });
  }

  /**
   * 2. 单个 SKU 更新 (包含图片全量替换)
   * 核心逻辑：区分 Factory(改源头+视图) 和 Group(只改视图)
   */
  public async update(
    ctx: ServiceContext,
    id: string, // SKU ID (物理ID)
    body: SkuContract["Update"]
  ) {
    const { mediaIds, mainImageId, ...updateFields } = body;
    const siteId = ctx.user.context.site?.id;
    const siteType = ctx.user.context.site?.siteType || "group";

    if (!siteId) throw new HttpError.BadRequest("无站点上下文");

    return await ctx.db.transaction(async (tx) => {
      // 1. 检查物理 SKU 是否存在
      const [existingSku] = await tx
        .select({ id: skuTable.id, productId: skuTable.productId })
        .from(skuTable)
        .where(eq(skuTable.id, id))
        .limit(1);

      if (!existingSku) throw new HttpError.NotFound(`SKU (ID: ${id})：不存在`);

      // 2. 检查 SiteProduct 是否存在 (为了拿到 siteProductId)
      // 注意：如果是集团，这里必须用 Upsert 逻辑或者确保 Group 已经有了 site_product
      // 这里简化：假设如果要在集团改 SKU，必须先收录 Product
      const [siteProduct] = await tx
        .select({ id: siteProductTable.id })
        .from(siteProductTable)
        .where(
          and(
            eq(siteProductTable.productId, existingSku.productId),
            eq(siteProductTable.siteId, siteId)
          )
        )
        .limit(1);

      if (!siteProduct) {
        // 如果集团想改 SKU 价格，但还没把 Product 收录进来，这是一个业务死锁。
        // 建议：前端先调用 Product Update 接口收录商品，再来改 SKU。
        throw new HttpError.BadRequest(
          "请先将商品加入当前站点，再修改 SKU 信息"
        );
      }

      // =========================================================
      // 场景 A: 工厂模式 (上帝权限)
      // =========================================================
      if (siteType === "factory") {
        // A1. 更新物理 SKU 表 (skuTable)
        const physicalUpdate: any = { updatedAt: new Date() };
        // 只有工厂能改库存、编码、物理属性
        if (updateFields.skuCode) physicalUpdate.skuCode = updateFields.skuCode;
        if (updateFields.stock) physicalUpdate.stock = updateFields.stock;
        if (updateFields.weight) physicalUpdate.weight = updateFields.weight;
        if (updateFields.volume) physicalUpdate.volume = updateFields.volume;
        if (updateFields.price) physicalUpdate.price = updateFields.price; // 更新指导价
        if (updateFields.marketPrice) physicalUpdate.marketPrice = updateFields.marketPrice; // 更新市场价
        if (updateFields.costPrice) physicalUpdate.costPrice = updateFields.costPrice; // 更新成本价
        if (updateFields.specJson)
          physicalUpdate.specJson = updateFields.specJson;

        await tx
          .update(skuTable)
          .set(physicalUpdate)
          .where(eq(skuTable.id, id));

        // A2. 强制同步自己的 site_sku 表
        await tx
          .insert(siteSkuTable)
          .values({
            siteId,
            siteProductId: siteProduct.id,
            skuId: id,
            price: updateFields.price, // 同步价格
            marketPrice: updateFields.marketPrice, // 同步市场价
            costPrice: updateFields.costPrice, // 同步成本价
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [siteSkuTable.siteId, siteSkuTable.skuId],
            set: {
              price: updateFields.price,
              marketPrice: updateFields.marketPrice,
              costPrice: updateFields.costPrice,
              // 如果工厂想通过 status 字段控制上下架，也可以在这里更新 isActive
            },
          });

        // A3. 图片更新 (只有工厂能改图片)
        if (mediaIds !== undefined) {
          await tx.delete(skuMediaTable).where(eq(skuMediaTable.skuId, id));
          if (mediaIds.length > 0) {
            // ... 插入图片关联 (同 create 逻辑) ...
            const relations = mediaIds.map((mediaId, idx) => ({
              tenantId: ctx.user.context.tenantId!,
              skuId: id,
              mediaId,
              isMain: mainImageId ? mediaId === mainImageId : idx === 0,
              sortOrder: idx,
            }));
            await tx.insert(skuMediaTable).values(relations);
          }
        }
      }

      // =========================================================
      // 场景 B: 集团模式 (仅视图权限)
      // =========================================================
      else {
        // B1. 只能更新 site_sku 表 (价格 & 上下架)
        // 绝对不能动 skuTable 和 skuMediaTable

        // 准备更新数据
        const siteUpdateData: any = {};
        if (updateFields.price) siteUpdateData.price = updateFields.price;
        if (updateFields.marketPrice) siteUpdateData.marketPrice = updateFields.marketPrice;
        if (updateFields.costPrice) siteUpdateData.costPrice = updateFields.costPrice;
        // 如果 body 里有 status 字段，可以映射为 isActive
        // if (updateFields.status !== undefined) siteUpdateData.isActive = updateFields.status === 1;

        // B2. 执行 Upsert
        if (Object.keys(siteUpdateData).length > 0) {
          await tx
            .insert(siteSkuTable)
            .values({
              siteId,
              siteProductId: siteProduct.id,
              skuId: id,
              price: updateFields.price || "0", // 初始插入必须有值
              isActive: true,
            })
            .onConflictDoUpdate({
              target: [siteSkuTable.siteId, siteSkuTable.skuId],
              set: siteUpdateData, // 只更新变动的字段
            });
        }
      }

      return { success: true, id };
    });
  }

  /**
   * 3. 批量 SKU 删除
   */
  public async batchDelete(ctx: ServiceContext, ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new HttpError.BadRequest("SKU ID 列表不能为空");
    }

    // 执行批量删除（依赖数据库的 Cascade Delete 删除 skuMediaTable）
    const deleted = await ctx.db
      .delete(skuTable)
      .where(
        and(
          inArray(skuTable.id, ids),
          eq(skuTable.tenantId, ctx.user.context.tenantId!), // 安全校验：租户隔离
          eq(skuTable.deptId, ctx.currentDeptId) // 安全校验：部门隔离
        )
      )
      .returning({ id: skuTable.id });

    if (deleted.length === 0) {
      throw new HttpError.NotFound(`SKU (IDs: ${ids.join(", ")})：不存在或无权删除`);
    }

    return {
      success: true,
      count: deleted.length,
      ids: deleted.map((d) => d.id),
    };
  }

  /**
   * 4. 单个 SKU 删除
   */
  public async delete(ctx: ServiceContext, id: string) {
    // 这里依赖数据库的 Cascade Delete 删除 skuMediaTable
    // 如果没有设置 Cascade，需要先手动删除关联表
    const [deleted] = await ctx.db
      .delete(skuTable)
      .where(
        and(
          eq(skuTable.id, id),
          eq(skuTable.tenantId, ctx.user.context.tenantId!), // 安全校验：租户隔离
          eq(skuTable.deptId, ctx.currentDeptId) // 安全校验：部门隔离
        )
      )
      .returning({ id: skuTable.id });

    if (!deleted) {
      throw new HttpError.NotFound(`SKU (ID: ${id})：不存在或无权删除`);
    }

    return { success: true, id: deleted.id };
  }

  /**
   * 4. 获取单个 SKU 详情 (用于编辑回显)
   */
  public async getDetail(ctx: ServiceContext, id: string) {
    // 1. 获取基础信息
    const [sku] = await ctx.db
      .select()
      .from(skuTable)
      .where(eq(skuTable.id, id))
      .limit(1);

    if (!sku) throw new HttpError.NotFound(`SKU (ID: ${id})：不存在`);

    // 2. 获取图片信息
    const media = await ctx.db
      .select({
        id: mediaTable.id,
        url: mediaTable.url,
        isMain: skuMediaTable.isMain,
        sortOrder: skuMediaTable.sortOrder,
      })
      .from(skuMediaTable)
      .innerJoin(mediaTable, eq(skuMediaTable.mediaId, mediaTable.id))
      .where(eq(skuMediaTable.skuId, id))
      .orderBy(skuMediaTable.sortOrder);

    return {
      ...sku,
      price: Number(sku.price),
      stock: Number(sku.stock),
      marketPrice: sku.marketPrice ? Number(sku.marketPrice) : null,
      costPrice: sku.costPrice ? Number(sku.costPrice) : null,
      // 🔥 添加 weight 和 volume 字段
      weight: sku.weight ? Number(sku.weight) : null,
      volume: sku.volume ? Number(sku.volume) : null,
      mediaIds: media.map((m) => m.id), // 方便前端回显 Select 组件
      images: media, // 方便前端展示图片预览
    };
  }

  /**
   * 3. SKU 列表查询 (支持 Site 价格透视)
   */
  public async list(ctx: ServiceContext, query: SkuContract["ListQuery"]) {
    const {
      page = 1,
      limit = 10,
      productId,
      search,
      status,
      sort = "createdAt",
      sortOrder = "desc",
    } = query;
    const siteId = ctx.user.context.site?.id;
    const baseConditions: any[] = [];

    // 1. 租户筛选 (必须)
    if (ctx.user?.context.tenantId) {
      baseConditions.push(eq(skuTable.tenantId, ctx.user.context.tenantId));
    }

    // 2. 商品筛选
    if (productId) {
      baseConditions.push(eq(skuTable.productId, productId));
    }

    // 3. 搜索条件 (SKU Code 或 商品名称)
    if (search) {
      baseConditions.push(like(skuTable.skuCode, `%${search}%`));
    }

    // 4. 状态筛选
    if (status !== undefined) {
      baseConditions.push(eq(skuTable.status, Number(status)));
    }

    // 排序处理
    const allowedSortFields: Record<string, any> = {
      id: skuTable.id,
      skuCode: skuTable.skuCode,
      price: skuTable.price,
      stock: skuTable.stock,
      status: skuTable.status,
      createdAt: skuTable.createdAt,
    };
    const orderByField =
      allowedSortFields[sort as keyof typeof allowedSortFields] ||
      skuTable.createdAt;

    // --- 构建主查询 ---
    // --- 核心查询：SKU + SiteSKU 透视 ---
    const items = await ctx.db
      .select({
        id: skuTable.id,
        skuCode: skuTable.skuCode,
        stock: skuTable.stock, // 物理库存 (所有站点共享)
        specJson: skuTable.specJson,

        // 🔥 价格透视逻辑：
        // 优先显示 site_sku.price (站点自定义价)，没有则显示 sku.price (出厂价)
        price: sql<string>`COALESCE(${siteSkuTable.price}, ${skuTable.price})`,

        // 原始价格 (用于前端对比)
        originalPrice: skuTable.price,
        marketPrice: skuTable.marketPrice,
        costPrice: skuTable.costPrice,


        // 上下架状态 (site_sku 控制)
        // 如果 site_sku 没记录，默认为"上架" (或者根据业务定为下架)
        isActive: sql<boolean>`COALESCE(${siteSkuTable.isActive}, true)`,

        // 标记：是否自定义过
        isCustomized: sql<boolean>`${siteSkuTable.id} IS NOT NULL`,
      })
      .from(skuTable)
      // 关联 SiteSKU (Left Join 以实现透视)
      .leftJoin(
        siteSkuTable,
        and(
          eq(skuTable.id, siteSkuTable.skuId),
          eq(siteSkuTable.siteId, siteId!) // 🔒 锁死当前站点
        )
      )
      .where(eq(skuTable.productId, productId)) // 必须传 productId
      .orderBy(desc(skuTable.createdAt));

    // --- 批量获取图片信息 (优化 N+1) ---
    const skuIds = items.map((item) => item.id);
    const images =
      skuIds.length > 0
        ? await ctx.db
            .select({
              skuId: skuMediaTable.skuId,
              mediaId: mediaTable.id,
              url: mediaTable.url,
              isMain: skuMediaTable.isMain,
            })
            .from(skuMediaTable)
            .innerJoin(mediaTable, eq(skuMediaTable.mediaId, mediaTable.id))
            .where(inArray(skuMediaTable.skuId, skuIds))
            .orderBy(skuMediaTable.sortOrder)
        : [];

    // 图片按 SKU 分组 Map
    const imageMap = images.reduce(
      (map: Record<string, (typeof images)[0][]>, img) => {
        if (!map[img.skuId]) map[img.skuId] = [];
        map[img.skuId].push(img);
        return map;
      },
      {}
    );

    // --- 最终数据格式化 ---
    return items.map((item: any) => {
      const skuImages = imageMap[item.id] || [];
      return {
        ...item,
        price: Number(item.price),
        stock: Number(item.stock),
        // 🔥 转换三种价格字段
        marketPrice: item.marketPrice ? Number(item.marketPrice) : null,
        costPrice: item.costPrice ? Number(item.costPrice) : null,
        // 🔥 转换 weight 和 volume 字段
        weight: item.weight ? Number(item.weight) : null,
        volume: item.volume ? Number(item.volume) : null,
        // 提取该 SKU 的主图
        mainImage: skuImages.find((i) => i.isMain) || skuImages[0] || null,
        allImages: skuImages,
      };
    });
  }
}
