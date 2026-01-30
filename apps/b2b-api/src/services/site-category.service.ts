import { HttpError } from "@pori15/elysia-unified-error";
import { type SiteCategoryContract, siteCategoryTable } from "@repo/contract";
import { eq } from "drizzle-orm";
import { type ServiceContext } from "../lib/type";

export class SiteCategoryService {
  public async create(
    body: SiteCategoryContract["Create"],
    ctx: ServiceContext
  ) {
    // 验证是否有站点上下文
    if (!ctx.user.context.site?.id) {
      throw new HttpError.BadRequest("当前部门未绑定站点，无法创建站点分类");
    }

    const insertData = {
      ...body,
      // 自动注入租户信息、部门ID和站点ID
      deptId: ctx.currentDeptId,
      tenantId: ctx.user.context.tenantId!,
      siteId: ctx.user.context.site.id,
    };
    const [res] = await ctx.db
      .insert(siteCategoryTable)
      .values(insertData)
      .returning();
    return res;
  }

  public async list(
    query: SiteCategoryContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search } = query;
    const res = await ctx.db.query.siteCategoryTable.findMany({
      where: {
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
        ...(search ? { name: { ilike: `%${search}%` } } : {}),
      },
    });
    return res;
  }

  public async update(
    id: string,
    body: SiteCategoryContract["Update"],
    ctx: ServiceContext
  ) {
    const [res] = await ctx.db
      .update(siteCategoryTable)
      .set(body)
      .where(eq(siteCategoryTable.id, id))
      .returning();
    return res;
  }

  public async delete(id: string, ctx: ServiceContext) {
    const res = await ctx.db
      .delete(siteCategoryTable)
      .where(eq(siteCategoryTable.id, id))
      .returning();
    return res;
  }

  /**
   * 获取树形结构的分类列表
   */
  async tree(ctx: ServiceContext) {
    const categories = await ctx.db.query.siteCategoryTable.findMany({
      where: {
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
      },
      orderBy: { sortOrder: "asc", createdAt: "asc" },
    });

    // 构建树形结构
    const categoryMap = new Map();
    const rootCategories = [];

    // 先将所有分类存入 map
    for (const category of categories) {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    }

    // 构建父子关系
    for (const category of categories) {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    }

    return rootCategories;
  }

  /**
   * 移动分类（更新父级关系）
   */
  async move(id: string, newParentId: string | null, ctx: ServiceContext) {
    // 验证分类是否存在
    const category = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        id,
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
      },
    });

    if (!category) {
      throw new HttpError.NotFound("分类不存在或无权访问");
    }

    // 验证不能将分类移动到自己的子级下
    if (newParentId) {
      const parent = await ctx.db.query.siteCategoryTable.findFirst({
        where: {
          id: newParentId,
          deptId: ctx.currentDeptId,
          tenantId: ctx.user.context.tenantId!,
        },
      });

      if (!parent) {
        throw new HttpError.NotFound("目标父级分类不存在或无权访问");
      }

      // 检查是否会形成循环引用
      const isDescendant = await this.checkIsDescendant(newParentId, id, ctx);
      if (isDescendant) {
        throw new HttpError.BadRequest("不能将分类移动到自己的子级下");
      }
    }

    // 更新父级关系
    const [updated] = await ctx.db
      .update(siteCategoryTable)
      .set({ parentId: newParentId })
      .where(eq(siteCategoryTable.id, id))
      .returning();

    return {
      id: updated.id,
      parentId: updated.parentId,
      message: "分类移动成功",
    };
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(
    items: Array<{ id: string; sortOrder: number }>,
    ctx: ServiceContext
  ) {
    await ctx.db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(siteCategoryTable)
          .set({ sortOrder: item.sortOrder })
          .where(eq(siteCategoryTable.id, item.id));
      }
    });

    return { success: true, message: "排序更新成功" };
  }

  /**
   * 切换激活状态
   */
  async patchStatus(id: string, ctx: ServiceContext) {
    const category = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        id,
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
      },
    });

    if (!category) {
      throw new HttpError.NotFound("分类不存在或无权访问");
    }

    const [updated] = await ctx.db
      .update(siteCategoryTable)
      .set({ isActive: !category.isActive })
      .where(eq(siteCategoryTable.id, id))
      .returning();

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: updated.isActive ? "分类已激活" : "分类已停用",
    };
  }

  /**
   * 辅助方法：检查是否为子孙分类
   */
  private async checkIsDescendant(
    ancestorId: string,
    descendantId: string,
    ctx: ServiceContext
  ): Promise<boolean> {
    const category = await ctx.db.query.siteCategoryTable.findFirst({
      where: {
        id: descendantId,
        deptId: ctx.currentDeptId,
        tenantId: ctx.user.context.tenantId!,
      },
    });

    if (!category) {
      return false;
    }

    const parentId = category.parentId;

    if (!parentId) {
      return false;
    }

    if (parentId === ancestorId) {
      return true;
    }

    // 递归检查
    return await this.checkIsDescendant(ancestorId, parentId, ctx);
  }
}
