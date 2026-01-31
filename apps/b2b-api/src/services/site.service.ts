import { type SiteContract, siteTable } from "@repo/contract";
import { eq } from "drizzle-orm";
import { type ServiceContext } from "../lib/type";

export class SiteService {
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async create(body: SiteContract["Create"], ctx: ServiceContext) {
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
    const [res] = await ctx.db.insert(siteTable).values(insertData).returning();
    return res;
  }

  public async list(query: SiteContract["ListQuery"], ctx: ServiceContext) {
    const { search } = query;

    const depts = await ctx.db.query.departmentTable.findFirst({
      where: {
        id: ctx.currentDeptId
      },
      with: {
        childrens: {
          with: {
            site: true
          }
        }
      }
    })

    const siteIds = depts?.childrens.map((item) => item.site.id) || [];

    const res = await ctx.db.query.siteTable.findMany({
      where: {
        tenantId: ctx.user.context.tenantId!,
        ...(search ? { name: { ilike: `%${search}%` } } : {}),
        id: { in: [...siteIds, ctx.user.context.site.id] },
      },
    });
    return res;


  }


  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async update(
    id: string,
    body: SiteContract["Update"],
    ctx: ServiceContext
  ) {
    const updateData = { ...body, updatedAt: new Date() };
    const [res] = await ctx.db
      .update(siteTable)
      .set(updateData)
      .where(eq(siteTable.id, id))
      .returning();
    return res;
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async delete(id: string, ctx: ServiceContext) {
    const [res] = await ctx.db
      .delete(siteTable)
      .where(eq(siteTable.id, id))
      .returning();
    return res;
  }
}
