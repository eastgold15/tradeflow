import { HttpError } from "@pori15/logixlysia";
import {
  salesResponsibilityTable,
  type UserContract,
  userRoleTable,
  userTable,
} from "@repo/contract";
import { eq } from "drizzle-orm";
import { db } from "~/db/connection";
import { auth } from "~/lib/auth";
import type { UserDto } from "~/middleware/auth";
import { type ServiceContext } from "../lib/type";

export class UserService {
  public async list(query: UserContract["ListQuery"], ctx: ServiceContext) {
    const { search } = query;
    const { currentDeptId, user } = ctx;
    const dataScope = user.roles[0].dataScope;
    let targetDeptIds: string[] = [];

    if (dataScope === "current_and_below") {
      // 查询当前部门及其直接子部门
      const dept = await ctx.db.query.departmentTable.findFirst({
        where: {
          id: currentDeptId,
        },
        with: {
          childrens: {
            columns: {
              id: true,
            },
          },
        },
      });
      if (!dept) {
        throw new HttpError.NotFound("没有");
      }
      targetDeptIds = [currentDeptId, ...dept.childrens.map((c) => c.id)];
    } else if (dataScope === "current") {
      targetDeptIds = [currentDeptId];
    }

    // 3. 构建查询条件
    const where: any = {
      tenantId: ctx.user.context.tenantId!,
      // 排除自己：通常“看下属”不包括看自己，如果需要看自己则删掉这一行
      id: { ne: ctx.user.id },
    };

    // 如果有部门限制，则加入 in 查询
    if (targetDeptIds.length > 0) {
      where.deptId = { in: targetDeptIds };
    }

    // 处理搜索
    if (search) {
      where.name = { ilike: `%${search}%` };
    }

    const res = await ctx.db.query.userTable.findMany({
      where,
      with: {
        roles: true,
        department: true,
      },
    });

    return res;
  }

  public async update(
    id: string,
    body: UserContract["Update"],
    ctx: ServiceContext,
    headers: any
  ) {
    return await ctx.db.transaction(async (tx) => {
      const { masterCategoryIds, roleId, password, ...updateData } = body;

      const [updatedUser] = await tx
        .update(userTable)
        .set(updateData)
        .where(eq(userTable.id, id))
        .returning();

      if (password) {
        const data = await auth.api.setUserPassword({
          body: {
            newPassword: password, // required
            userId: updatedUser.id, // required
          },
          // This endpoint requires session cookies.
          headers,
        });
      }

      if (roleId) {
        await tx.delete(userRoleTable).where(eq(userRoleTable.userId, id));
        await tx.insert(userRoleTable).values({
          userId: id,
          roleId,
        });
      }

      if (masterCategoryIds) {
        await tx
          .delete(salesResponsibilityTable)
          .where(eq(salesResponsibilityTable.userId, id));

        if (masterCategoryIds.length > 0) {
          await tx.insert(salesResponsibilityTable).values(
            masterCategoryIds.map((catId: string) => ({
              userId: id,
              masterCategoryId: catId,
              siteId: ctx.user.context.site.id,
              tenantId: ctx.user.context.tenantId!,
            }))
          );
        }
      }

      // 4. 处理角色（先删除旧角色，再插入新角色）
      if (roleId) {
        await tx.delete(userRoleTable).where(eq(userRoleTable.userId, id));
        await tx.insert(userRoleTable).values({
          userId: id,
          roleId,
        });
      }

      if (masterCategoryIds) {
        await tx
          .delete(salesResponsibilityTable)
          .where(eq(salesResponsibilityTable.userId, id));

        if (masterCategoryIds.length > 0) {
          await tx.insert(salesResponsibilityTable).values(
            masterCategoryIds.map((catId: string) => ({
              userId: id,
              masterCategoryId: catId,
              siteId: ctx.user.context.site.id,
              tenantId: ctx.user.context.tenantId!,
            }))
          );
        }
      }

      return updatedUser;
    });
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async delete(id: string, ctx: ServiceContext) {
    const [res] = await ctx.db
      .delete(userTable)
      .where(eq(userTable.id, id))
      .returning();
    return res;
  }

  /**
   * 获取租户下所有可切换的部门/站点列表
   * 权限规则（基于用户的原始部门）：
   * 1. 超级管理员 (isSuperAdmin): 返回租户下所有部门（跨越所有出口商）
   * 2. 出口商部门用户 (原始 category === "group"): 返回原始 group + 其下所有 factory
   * 3. 工厂部门用户 (原始 category === "factory"): 只返回原始 factory
   *
   * 注意：使用用户的原始部门（数据库中的 deptId）而不是当前临时切换的部门
   */
  async getSwitchableDepartments(user: UserDto) {
    // 获取用户的原始部门（从数据库查询）
    const rawUser = await db.query.userTable.findFirst({
      where: { id: user.id },
      columns: { deptId: true },
    });

    const originalDeptId = rawUser?.deptId;
    if (!originalDeptId) {
      throw new HttpError.BadRequest("用户没有归属部门");
    }

    // 查询原始部门的信息
    const originalDept = await db.query.departmentTable.findFirst({
      where: { id: originalDeptId },
      columns: { id: true, category: true },
    });

    const originalCategory = originalDept?.category;
    let targetDeptIds: string[] = [];

    // 超级管理员：返回租户下所有部门
    if (user.isSuperAdmin) {
      // 不设置 targetDeptIds，查询所有部门
    }
    // 出口商部门用户：返回原始 group 及其子部门
    else if (originalCategory === "group") {
      const dept = await db.query.departmentTable.findFirst({
        where: { id: originalDeptId },
        with: {
          childrens: {
            columns: { id: true },
          },
        },
      });
      if (dept) {
        targetDeptIds = [originalDeptId, ...dept.childrens.map((c) => c.id)];
      }
    }
    // 工厂部门用户：只返回原始 factory 部门
    else if (originalCategory === "factory") {
      targetDeptIds = [originalDeptId];
    }

    // 构建查询条件
    const where: any = {
      tenantId: user.context.tenantId,
    };

    // 如果有部门限制，则加入 in 查询
    if (targetDeptIds.length > 0) {
      where.id = { in: targetDeptIds };
    }

    // 获取可切换的部门列表
    const departments = await db.query.departmentTable.findMany({
      where,
      columns: {
        id: true,
        name: true,
        category: true,
        parentId: true,
      },
      with: {
        site: {
          columns: {
            id: true,
            name: true,
            domain: true,
            siteType: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      current: {
        id: user.context.department?.id,
        name: user.context.department?.name,
        category: user.context.department?.category,
        site: {
          id: user.context.site.id,
          name: user.context.site.name,
          domain: user.context.site.domain,
          siteType: user.context.site.siteType,
        },
        parentId: user.context.department.parentId,
      },
      switchableDepartments: departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        category: dept.category,
        parentId: dept.parentId,
        site: dept.site
          ? {
            id: dept.site.id,
            name: dept.site.name,
            domain: dept.site.domain,
            siteType: dept.site.siteType,
          }
          : null,
      })),
    };
  }

  /**
   * 创建用户（通用方法）
   * 支持创建任意角色的用户，包括业务员
   */
  public async create(body: UserContract["Create"], ctx: ServiceContext) {
    const { db, user } = ctx;

    // 使用事务创建用户
    return await db.transaction(async (tx) => {
      // 1. 创建用户（通过 better-auth）
      const newUser = await auth.api.signUpEmail({
        body: {
          name: body.name,
          email: body.email,
          password: body.password,
          tenantId: user.context.tenantId!,
          deptId: body.deptId,
          phone: body.phone,
          whatsapp: body.whatsapp,
          position: body.position,
        },
      });
      const updatedUser = newUser.user;

      // 3. 分配角色给用户
      await tx.insert(userRoleTable).values({
        userId: updatedUser.id,
        roleId: body.roleId,
      });

      // 4. 如果是业务员角色，分配主分类
      if (body.masterCategoryIds && body.masterCategoryIds.length > 0) {
        // 第一步：构建要插入的数据数组
        // 这里的 map 会返回一个对象数组：[{ userId: '...', masterCategoryId: '...', tenantId: '...' }, ...]
        const insertData = body.masterCategoryIds.map((catId) => ({
          userId: updatedUser.id,
          masterCategoryId: catId, // 注意：这里对应你表里的单数列名
          tenantId: user.context.tenantId, // 🌟 别忘了带上租户ID，这很重要！
          // 如果表里有 priority 或 isAutoAssign 且有默认值，这里可以不传
        }));

        // 第二步：直接把数组传给 values()
        // Drizzle 会自动把它转换成单条 SQL: INSERT INTO ... VALUES (...), (...), (...)
        await tx.insert(salesResponsibilityTable).values(insertData);
      }

      // 返回用户详情
      const userDetails = await tx.query.userTable.findFirst({
        where: {
          id: updatedUser.id,
        },
        with: {
          roles: true,
          department: true,
          assignMasterCategories: true,
        },
      });
      return userDetails;
    });
  }
}
