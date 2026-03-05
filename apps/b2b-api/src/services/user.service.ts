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
        throw new HttpError.NotFound(
          `Department (ID: ${currentDeptId})：不存在`
        );
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
        assignMasterCategories: true,
      },
    });

    return res;
  }

  /**
   * 更新用户信息
   * 支持更新基础信息、角色、密码以及业务员的主分类分配
   */
  public async update(
    id: string,
    body: UserContract["Update"],
    ctx: ServiceContext,
    headers: any
  ) {
    console.log("=== [UserService.update] 开始 ===");
    console.log("[DEBUG] 接收到的完整 body:", JSON.stringify(body, null, 2));
    console.log("[DEBUG] masterCategoryIds:", body.masterCategoryIds);
    console.log(
      "[DEBUG] masterCategoryIds 类型:",
      typeof body.masterCategoryIds
    );
    console.log(
      "[DEBUG] masterCategoryIds 是否为数组:",
      Array.isArray(body.masterCategoryIds)
    );

    return await ctx.db.transaction(async (tx) => {
      const { masterCategoryIds, roleId, password, ...updateData } = body;

      console.log("[DEBUG] 解构后的 masterCategoryIds:", masterCategoryIds);
      console.log("[DEBUG] 解构后的 updateData:", updateData);

      // 1. 更新用户基础信息
      const [updatedUser] = await tx
        .update(userTable)
        .set(updateData)
        .where(eq(userTable.id, id))
        .returning();

      console.log("[DEBUG] 更新用户基础信息成功, userId:", updatedUser.id);

      // 2. 如果提供了密码，更新密码
      if (password) {
        await auth.api.setUserPassword({
          body: {
            newPassword: password,
            userId: updatedUser.id,
          },
          headers,
        });
      }

      // 3. 处理角色更新（先删除旧角色，再插入新角色）
      if (roleId) {
        console.log("[DEBUG] 开始处理角色更新, roleId:", roleId);
        await tx.delete(userRoleTable).where(eq(userRoleTable.userId, id));
        await tx.insert(userRoleTable).values({
          userId: id,
          roleId,
        });
        console.log("[DEBUG] 角色更新完成");
      }

      // 4. 处理主分类分配（业务员专用）
      console.log("[DEBUG] 开始检查 masterCategoryIds");
      console.log("[DEBUG] masterCategoryIds 存在:", !!masterCategoryIds);
      console.log("[DEBUG] masterCategoryIds 值:", masterCategoryIds);

      if (masterCategoryIds) {
        console.log(
          "[DEBUG] 开始处理主分类分配, 数量:",
          masterCategoryIds.length
        );
        console.log("[DEBUG] 主分类 ID 列表:", masterCategoryIds);

        // 先删除旧的主分类关联
        const deleteResult = await tx
          .delete(salesResponsibilityTable)
          .where(eq(salesResponsibilityTable.userId, id))
          .returning();
        console.log(
          "[DEBUG] 删除旧的主分类关联完成, 删除数量:",
          deleteResult.length
        );

        // 如果有新的主分类，批量插入
        if (masterCategoryIds.length > 0) {
          const insertData = masterCategoryIds.map((catId: string) => {
            console.log("[DEBUG] 准备插入主分类, catId:", catId);
            return {
              userId: id,
              masterCategoryId: catId,
              siteId: ctx.user.context.site.id,
              tenantId: ctx.user.context.tenantId!,
            };
          });
          console.log(
            "[DEBUG] 准备插入的数据:",
            JSON.stringify(insertData, null, 2)
          );

          try {
            await tx.insert(salesResponsibilityTable).values(insertData);
            console.log("[DEBUG] 主分类插入完成");
          } catch (error: any) {
            console.error("[❌] 主分类插入失败:", error.message);
            console.error("[❌] 完整错误:", error);
            throw error;
          }
        } else {
          console.log("[DEBUG] masterCategoryIds 为空数组，跳过插入");
        }
      } else {
        console.log("[DEBUG] masterCategoryIds 为 undefined/null，跳过处理");
      }

      console.log("=== [UserService.update] 结束 ===");
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

    console.log("=== [UserService.create] 开始 ===");
    console.log("[DEBUG] 接收到的完整 body:", JSON.stringify(body, null, 2));
    console.log("[DEBUG] masterCategoryIds:", body.masterCategoryIds);
    console.log(
      "[DEBUG] masterCategoryIds 类型:",
      typeof body.masterCategoryIds
    );
    console.log(
      "[DEBUG] masterCategoryIds 是否为数组:",
      Array.isArray(body.masterCategoryIds)
    );

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
