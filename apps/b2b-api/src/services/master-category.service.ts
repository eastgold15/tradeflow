import { HttpError } from "@pori15/logixlysia";
import {
  type MasterCategoryContract,
  masterCategoryTable,
} from "@repo/contract";
import { eq } from "drizzle-orm";
import { type ServiceContext } from "../lib/type";

export class MasterCategoryService {
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async create(
    body: MasterCategoryContract["Create"],
    ctx: ServiceContext
  ) {
    if (!ctx.user?.context?.tenantId) {
      throw new HttpError.BadGateway("User context or tenantId is required");
    }

    const insertData = {
      ...body,
      tenantId: ctx.user.context.tenantId!,
      createdBy: ctx.user.id,
      deptId: ctx.currentDeptId,
    };
    const [res] = await ctx.db
      .insert(masterCategoryTable)
      .values(insertData)
      .returning();
    return res;
  }

  public async list(
    query: MasterCategoryContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const data = await ctx.db.query.masterCategoryTable.findMany({
      where: {
        tenantId: ctx.user.context.tenantId!,
        ...(query.isActive !== undefined && query.isActive !== null
          ? { isActive: query.isActive }
          : {}),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return data;
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async update(
    id: string,
    body: MasterCategoryContract["Update"],
    ctx: ServiceContext
  ) {
    const updateData = { ...body, updatedAt: new Date() };
    const [res] = await ctx.db
      .update(masterCategoryTable)
      .set(updateData)
      .where(eq(masterCategoryTable.id, id))
      .returning();
    return res;
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async delete(id: string, ctx: ServiceContext) {
    const [res] = await ctx.db
      .delete(masterCategoryTable)
      .where(eq(masterCategoryTable.id, id))
      .returning();
    return res;
  }

  /**
   * 获取树形结构的主分类列表
   */
  async tree(ctx: ServiceContext) {
    const categories = await ctx.db.query.masterCategoryTable.findMany({
      where: {
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
   * 移动主分类（更新父级关系）
   */
  async move(id: string, newParentId: string | null, ctx: ServiceContext) {
    // 验证分类是否存在
    const category = await ctx.db.query.masterCategoryTable.findFirst({
      where: {
        id,
        tenantId: ctx.user.context.tenantId!,
      },
    });

    if (!category) {
      throw new HttpError.NotFound(`MasterCategory (ID: ${id})：不存在或无权访问`);
    }

    // 验证不能将分类移动到自己的子级下
    if (newParentId) {
      const parent = await ctx.db.query.masterCategoryTable.findFirst({
        where: {
          id: newParentId,
          tenantId: ctx.user.context.tenantId!,
        },
      });

      if (!parent) {
        throw new HttpError.NotFound(`MasterCategory (ID: ${newParentId})：目标父级分类不存在或无权访问`);
      }

      // 检查是否会形成循环引用
      const isDescendant = await this.checkIsDescendant(newParentId, id, ctx);
      if (isDescendant) {
        throw new HttpError.BadRequest(`MasterCategory (ID: ${id})：不能将分类移动到自己的子级下`);
      }
    }

    // 更新父级关系
    const [updated] = await ctx.db
      .update(masterCategoryTable)
      .set({ parentId: newParentId })
      .where(eq(masterCategoryTable.id, id))
      .returning();

    return {
      id: updated.id,
      parentId: updated.parentId,
      message: "主分类移动成功",
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
          .update(masterCategoryTable)
          .set({ sortOrder: item.sortOrder })
          .where(eq(masterCategoryTable.id, item.id));
      }
    });

    return { success: true, message: "排序更新成功" };
  }

  /**
   * 切换激活状态
   */
  async patchStatus(id: string, ctx: ServiceContext) {
    const category = await ctx.db.query.masterCategoryTable.findFirst({
      where: {
        id,
        tenantId: ctx.user.context.tenantId!,
      },
    });

    if (!category) {
      throw new HttpError.NotFound(`MasterCategory (ID: ${id})：不存在或无权访问`);
    }

    const [updated] = await ctx.db
      .update(masterCategoryTable)
      .set({ isActive: !category.isActive })
      .where(eq(masterCategoryTable.id, id))
      .returning();

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: updated.isActive ? "主分类已激活" : "主分类已停用",
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
    const category = await ctx.db.query.masterCategoryTable.findFirst({
      where: {
        id: descendantId,
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
