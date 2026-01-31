import { HttpError } from "@pori15/logixlysia";
import {
  type HeroCardContract,
  heroCardTable,
  mediaTable,
} from "@repo/contract";
import {
  and,
  asc,
  desc,
  eq,
  getColumns,
  ilike,
  inArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { type ServiceContext } from "../lib/type";

export class HeroCardService {
  public async create(body: HeroCardContract["Create"], ctx: ServiceContext) {
    const insertData = {
      ...body,
      // ✅ 自动注入租户信息（由于已强制必填，直接使用）
      tenantId: ctx.user.context.tenantId,
      siteId: ctx.user.context.site.id,
      deptId: ctx.currentDeptId!,
      createdBy: ctx.user.id,
    };
    const [res] = await ctx.db
      .insert(heroCardTable)
      .values(insertData)
      .returning();
    return res;
  }

  /**
   * 获取所有首页展示卡片（后台管理）
   */
  async listWithMedia(query: any, ctx: ServiceContext) {
    const { page = 1, limit = 10, search } = query;

    // 1. 确保 filters 始终是一个干净的数组
    const filters: SQL[] = [];
    if (search) {
      filters.push(
        or(
          ilike(heroCardTable.title, `%${search}%`),
          ilike(heroCardTable.description, `%${search}%`)
        )!
      );
    }

    // 2. 构建基础查询
    const baseQuery = ctx.db
      .select({
        ...getColumns(heroCardTable),
        mediaUrl: mediaTable.url,
      })
      .from(heroCardTable)
      .leftJoin(mediaTable, eq(heroCardTable.mediaId, mediaTable.id));

    // 3. 添加查询条件
    const whereConditions: SQL[] = [];
    if (ctx.currentDeptId) {
      whereConditions.push(eq(heroCardTable.deptId, ctx.currentDeptId));
    }
    if (ctx.user?.context.tenantId) {
      whereConditions.push(
        eq(heroCardTable.tenantId, ctx.user.context.tenantId)
      );
    }

    const finalQuery =
      whereConditions.length > 0 || filters.length > 0
        ? baseQuery.where(and(...whereConditions, ...filters))
        : baseQuery;

    const results = await finalQuery
      .orderBy(asc(heroCardTable.sortOrder), desc(heroCardTable.createdAt))
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit));

    // 4. 计算总数
    const countConditions = [
      ctx.currentDeptId
        ? eq(heroCardTable.deptId, ctx.currentDeptId)
        : undefined,
      ctx.user?.context.tenantId
        ? eq(heroCardTable.tenantId, ctx.user.context.tenantId)
        : undefined,
      ...filters,
    ].filter((c): c is SQL => c !== undefined);

    const [{ count }] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(heroCardTable)
      .where(countConditions.length > 0 ? and(...countConditions) : undefined);

    // 5. 格式化数据
    const data = results.map((item) => ({
      ...item,
    }));

    return {
      data,
      total: Number(count),
      page: Number(page),
      limit: Number(limit),
    };
  }

  public async list(query: HeroCardContract["ListQuery"], ctx: ServiceContext) {
    const { search } = query;

    const res = await ctx.db.query.heroCardTable.findMany({
      where: {
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
        ...(search
          ? {
              OR: [
                { title: { ilike: `%${search}%` } },
                { description: { ilike: `%${search}%` } },
              ],
            }
          : {}),
      },
      with: {
        media: true,
      },
      orderBy: {
        sortOrder: "asc",
        createdAt: "desc",
      },
    });
    return res;
  }

  public async update(
    id: string,
    body: HeroCardContract["Update"],
    ctx: ServiceContext
  ) {
    const updateData = { ...body, updatedAt: new Date() };
    const [res] = await ctx.db
      .update(heroCardTable)
      .set(updateData)
      .where(eq(heroCardTable.id, id))
      .returning();
    return res;
  }

  public async delete(id: string, ctx: ServiceContext) {
    const [res] = await ctx.db
      .delete(heroCardTable)
      .where(eq(heroCardTable.id, id))
      .returning();
    return res;
  }

  /**
   * 创建 Hero Card
   */
  async createHeroCard(data: any, mediaId: string | null, ctx: ServiceContext) {
    return await this.create(
      {
        ...data,
        mediaId,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        backgroundClass: data.backgroundClass ?? "bg-blue-50",
      },
      ctx
    );
  }

  /**
   * 更新排序
   */
  async updateSortOrder(
    items: Array<{ id: string; sortOrder: number }>,
    ctx: ServiceContext
  ) {
    await ctx.db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(heroCardTable)
          .set({ sortOrder: item.sortOrder })
          .where(eq(heroCardTable.id, item.id));
      }
    });

    return { success: true };
  }

  /**
   * 切换状态
   */
  async patchStatus(id: string, ctx: ServiceContext) {
    const card = await ctx.db.query.heroCardTable.findFirst({
      where: {
        id,
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
      },
    });
    if (!card) throw new HttpError.NotFound(`HeroCard (ID: ${id})：不存在`);
    const [updated] = await ctx.db
      .update(heroCardTable)
      .set({ isActive: !card.isActive })
      .where(eq(heroCardTable.id, id))
      .returning();

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: updated.isActive ? "已激活" : "已停用",
    };
  }

  /**
   * 批量删除首页展示卡片
   */
  async batchDelete(ids: string[], ctx: ServiceContext) {
    const whereConditions: SQL[] = [inArray(heroCardTable.id, ids)];

    if (ctx.currentDeptId) {
      whereConditions.push(eq(heroCardTable.deptId, ctx.currentDeptId));
    }
    if (ctx.user?.context.tenantId) {
      whereConditions.push(
        eq(heroCardTable.tenantId, ctx.user.context.tenantId)
      );
    }

    // 查找所有符合条件的卡片
    const cards = await ctx.db
      .select()
      .from(heroCardTable)
      .where(and(...whereConditions));

    if (cards.length === 0) {
      throw new HttpError.NotFound(`HeroCard (IDs: ${ids.join(", ")})：未找到可删除的记录`);
    }

    // 批量删除
    await ctx.db.delete(heroCardTable).where(and(...whereConditions));

    return {
      count: cards.length,
      message: `成功删除 ${cards.length} 个首页展示卡片`,
    };
  }
}
