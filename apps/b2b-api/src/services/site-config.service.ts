import { type SiteConfigContract, siteConfigTable } from "@repo/contract";
import { and, eq, sql } from "drizzle-orm";
import { type ServiceContext } from "../lib/type";

export class SiteConfigService {
  public async create(body: SiteConfigContract["Create"], ctx: ServiceContext) {
    const insertData = {
      ...body,
      // 自动注入租户信息
      ...(ctx.user
        ? {
            tenantId: ctx.user.context.tenantId!,
            createdBy: ctx.user.id,
            deptId: ctx.currentDeptId,
          }
        : {}),
    };
    const [res] = await ctx.db
      .insert(siteConfigTable)
      .values(insertData)
      .returning();
    return res;
  }

  public async list(
    query: SiteConfigContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search } = query;

    const res = await ctx.db.query.siteConfigTable.findMany({
      where: {
        ...(search ? { key: { ilike: `%${search}%` } } : {}),
      },
    });
    return res;
  }

  public async update(
    id: string,
    body: SiteConfigContract["Update"],
    ctx: ServiceContext
  ) {
    const updateData = { ...body, updatedAt: new Date() };
    const [res] = await ctx.db
      .update(siteConfigTable)
      .set(updateData)
      .where(eq(siteConfigTable.id, id))
      .returning();
    return res;
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async delete(id: string, ctx: ServiceContext) {
    const [res] = await ctx.db
      .delete(siteConfigTable)
      .where(eq(siteConfigTable.id, id))
      .returning();
    return res;
  }

  /**
   * 获取所有配置键及使用数量
   */
  async getKeys(ctx: ServiceContext) {
    const whereConditions: any[] = [];

    // if (ctx.user?.context.tenantId)
    //   whereConditions.push(eq(siteConfigTable.siteId, ctx.user.context.site.id!));
    // 使用 SQL 聚合查询获取配置键统计
    const keys = await ctx.db
      .select({
        key: siteConfigTable.key,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(siteConfigTable)
      .where(and(...whereConditions))
      .groupBy(siteConfigTable.key)
      .orderBy(sql`count(*) desc`);

    return {
      keys,
    };
  }
}
