import { randomBytes, scryptSync } from "node:crypto";
import { HttpError } from "@pori15/logixlysia";
import {
  type DepartmentContract,
  departmentTable,
  salesResponsibilityTable,
  siteTable,
  userRoleTable,
  userTable,
} from "@repo/contract";
import { eq, inArray } from "drizzle-orm";
import { auth } from "~/lib/auth";
import { type ServiceContext } from "../lib/type";

function generateCompatibleHash(password: string) {
  const salt = randomBytes(16); // 生成16字节随机盐值
  const hash = scryptSync(password, salt, 64, {
    N: 16_384,
    r: 8,
    p: 1,
  });

  // 拼接成 salt_hex : hash_hex 格式
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export class DepartmentService {
  public async create(body: DepartmentContract["Create"], ctx: ServiceContext) {
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
      .insert(departmentTable)
      .values(insertData)
      .returning();
    return res;
  }

  public async list(
    query: DepartmentContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search } = query;
    const { currentDeptId, db, user } = ctx;
    // 1. 初始化基础过滤条件（租户隔离）
    const where: any = {};
    //出口商业务员
    if (user.roles[0].dataScope === "current_and_below") {
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
        throw new HttpError.NotFound("不存在");
      }
      const allRelatedIds = [
        currentDeptId, // 包含自己
        ...(dept.childrens ?? []).map((c) => c.id), // 包含下级
      ];

      where.id = { in: allRelatedIds };
    } else if (user.roles[0].dataScope === "current") {
      where.id = { eq: currentDeptId };
    }
    const res = await ctx.db.query.departmentTable.findMany({
      where: {
        tenantId: ctx.user.context.tenantId!,
        ...(search ? { name: { ilike: `%${search}%` } } : {}),
        ...where,
      },
      with: {
        // 只加载必要的管理员信息，用于列表显示
        users: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            updatedAt: true,
          },
          with: {
            roles: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    });

    // 为每个部门添加管理员信息
    const result = res.map((dept) => {
      const managers =
        dept.users?.filter((u) =>
          u.roles?.some((r) => r.name === "工厂管理员")
        ) || [];
      const manager =
        managers.length > 0
          ? managers.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )[0]
          : null;

      const { users, ...deptWithoutUsers } = dept;
      return {
        ...deptWithoutUsers,
        manager: manager
          ? {
            id: manager.id,
            name: manager.name,
            email: manager.email,
            phone: manager.phone,
          }
          : null,
      };
    });

    console.log("=== Department List Debug ===");
    console.log("返回部门数量:", result.length);
    console.log("部门列表:", JSON.stringify(result, null, 2));

    return result;
  }

  public async update(
    id: string,
    body: DepartmentContract["Update"],
    ctx: ServiceContext
  ) {
    const updateData = { ...body, updatedAt: new Date() };
    const [res] = await ctx.db
      .update(departmentTable)
      .set(updateData)
      .where(eq(departmentTable.id, id))
      .returning();
    return res;
  }

  public async delete(id: string, ctx: ServiceContext) {
    return await ctx.db.transaction(async (tx) => {
      // 1. 检查部门是否存在
      const dept = await tx.query.departmentTable.findFirst({
        where: { id },
      });
      if (!dept) {
        throw new HttpError.NotFound("部门不存在");
      }

      // 2. 检查是否有子部门
      const children = await tx.query.departmentTable.findMany({
        where: { parentId: id },
      });
      if (children.length > 0) {
        throw new HttpError.BadRequest("请先删除子部门");
      }

      // 3. 删除该部门的所有用户（及用户角色关联）
      const users = await tx.query.userTable.findMany({
        where: { deptId: id },
        columns: { id: true },
      });
      const userIds = users.map((u) => u.id);
      if (userIds.length > 0) {
        // 先删除用户角色关联
        await tx
          .delete(userRoleTable)
          .where(inArray(userRoleTable.userId, userIds));

        // 删除用户
        await tx.delete(userTable).where(eq(userTable.deptId, id));
      }

      // 4. 删除绑定到该部门的站点
      // 站点的关联数据会通过数据库 CASCADE 自动删除：
      // - site_category, site_config, site_product, site_sku
      // - ad, hero_card
      // 但 sales_responsibility 没有 CASCADE，需要手动删除
      await tx
        .delete(salesResponsibilityTable)
        .where(eq(salesResponsibilityTable.siteId, id));
      await tx.delete(siteTable).where(eq(siteTable.boundDeptId, id));

      // 5. 删除部门
      const [deleted] = await tx
        .delete(departmentTable)
        .where(eq(departmentTable.id, id))
        .returning();

      return deleted;
    });
  }

  public async detail(id: string, ctx: ServiceContext) {
    console.log("=== Department Detail Debug ===");
    console.log("查询部门 ID:", id);

    const department = await ctx.db.query.departmentTable.findFirst({
      where: {
        id,
      },
      with: {
        users: {
          with: {
            roles: true,
          },
        },
        site: true,
      },
    });

    if (!department) {
      throw new HttpError.NotFound("部门不存在");
    }

    console.log("部门用户数量:", department.users?.length || 0);
    console.log("所有用户:", JSON.stringify(department.users, null, 2));

    // 选择最新创建/更新的管理员，而不是第一个
    const managers =
      department.users?.filter(
        (user) =>
          user.roles.some((role) => role.name === "工厂管理员") && user.isActive
      ) || [];

    // 按 updatedAt 降序排序，选择最新的
    const manager =
      managers.length > 0
        ? managers.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0]
        : null;

    console.log("找到的管理员:", JSON.stringify(manager, null, 2));

    const result = {
      ...department,
      manager: manager
        ? {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
        }
        : null,
    };

    console.log("返回的部门详情:", JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 创建部门+站点+管理员
   * 注意：用户创建必须在事务外部使用 better auth
   */
  async createDepartmentWithSiteAndAdmin(
    body: typeof DepartmentContract.CreateDepartmentWithSiteAndAdmin.static,
    ctx: ServiceContext,
    headers: any
  ) {
    const { db, user } = ctx;
    const tenantId = user.context.tenantId!;

    if (!tenantId) {
      throw new HttpError.BadRequest("租户ID不能为空");
    }

    // 步骤1：使用事务创建部门和站点
    const { dept, newSite } = await db.transaction(async (tx) => {
      // 1. 创建部门
      // 注意：使用用户原始部门ID作为父级，而不是切换后的 currentDeptId
      // 因为无论用户切换到哪个部门，新创建的部门都应该挂在用户的原始部门下
      const parentDeptId = user.context.department.id;

      const [dept] = await tx
        .insert(departmentTable)
        .values({
          tenantId,
          name: body.department.name,
          parentId: parentDeptId || null,
          code: body.department.code,
          category: body.department.category as "factory" | "group",
          address: body.department.address,
          contactPhone: body.department.contactPhone,
          logo: body.department.logo,
          extensions: body.department.extensions || null,
          isActive: true,
        })
        .returning();

      if (!dept?.id) {
        throw new HttpError.InternalServerError(
          "部门ID获取失败，无法继续创建关联数据"
        );
      }

      console.log("departmentId:", dept.id);

      // 2. 创建站点
      const [newSite] = await tx
        .insert(siteTable)
        .values({
          tenantId,
          boundDeptId: dept.id,
          siteType: "factory",
          name: body.site.name,
          domain: body.site.domain,
          isActive: body.site.isActive ?? true,
        })
        .returning();

      if (!newSite?.id) {
        throw new HttpError.InternalServerError("站点创建失败，无法获取站点ID");
      }

      return { dept, newSite };
    });

    // 事务已提交，部门和站点已在数据库中

    // 步骤2：使用 better auth 创建管理员用户（必须在事务外部）
    const departmentId = dept.id;
    const newUserResponse = await auth.api.createUser({
      body: {
        email: body.admin.email,
        password: body.admin.password,
        name: body.admin.name,
        role: "admin",
        data: {
          deptId: departmentId,
          tenantId,
          phone: body.admin.phone,
        },
      },
    });

    const adminUserId = newUserResponse.user.id;
    const adminUserEmail = newUserResponse.user.email;
    const adminUserName = newUserResponse.user.name;

    console.log("新管理员创建完成，userId:", adminUserId);

    // 步骤3：分配角色给用户
    const role = await db.query.roleTable.findFirst({
      where: {
        name: "工厂管理员",
      },
    });

    if (role) {
      await db
        .insert(userRoleTable)
        .values({
          userId: adminUserId,
          roleId: role.id,
        })
        .onConflictDoNothing();
    }

    // 构造返回结果
    const result = {
      department: {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        category: dept.category,
      },
      site: {
        id: newSite.id,
        name: newSite.name,
        domain: newSite.domain,
        siteType: newSite.siteType,
      },
      admin: {
        id: adminUserId,
        name: adminUserName,
        email: adminUserEmail,
      },
    };

    console.log("=== 创建完成 ===");
    console.log(JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * 更新部门+站点+管理员
   * 管理员信息可选
   * 注意：用户创建/更新必须在事务外部使用 better auth
   */
  async updateDepartmentWithSiteAndAdmin(
    body: typeof DepartmentContract.UpdateDepartmentWithSiteAndAdmin.static,
    ctx: ServiceContext,
    headers: any
  ) {
    const { db, user } = ctx;
    const tenantId = user.context.tenantId!;
    const departmentId = body.department.id;

    if (!tenantId) {
      throw new HttpError.BadRequest("租户ID不能为空");
    }

    // 步骤1：使用事务更新部门和站点
    const { dept, newSite } = await db.transaction(async (tx) => {
      // 1. 检查部门是否存在
      const existingDept = await tx.query.departmentTable.findFirst({
        where: { id: departmentId },
      });

      if (!existingDept) {
        throw new HttpError.NotFound("部门不存在");
      }

      // 2. 更新部门
      const [dept] = await tx
        .update(departmentTable)
        .set({
          name: body.department.name,
          parentId: body.department.parentId || null,
          code: body.department.code,
          category: body.department.category as "factory" | "group",
          address: body.department.address,
          contactPhone: body.department.contactPhone,
          logo: body.department.logo,
          extensions: body.department.extensions || null,
          updatedAt: new Date(),
        })
        .where(eq(departmentTable.id, departmentId))
        .returning();

      if (!dept?.id) {
        throw new HttpError.InternalServerError("部门更新失败");
      }

      console.log("departmentId:", departmentId);

      // 3. 更新站点（使用 Upsert）
      const [newSite] = await tx
        .insert(siteTable)
        .values({
          tenantId,
          boundDeptId: departmentId,
          siteType: "factory",
          name: body.site.name,
          domain: body.site.domain,
          isActive: body.site.isActive ?? true,
        })
        .onConflictDoUpdate({
          target: siteTable.boundDeptId,
          set: {
            name: body.site.name,
            domain: body.site.domain,
            isActive: body.site.isActive ?? true,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!newSite?.id) {
        throw new HttpError.InternalServerError("站点更新失败");
      }

      return { dept, newSite };
    });

    // 事务已提交

    // 步骤2：如果提供了管理员信息，则创建/更新用户（必须在事务外部）
    let adminInfo: { id: string; name: string; email: string } | undefined;

    if (body.admin) {
      let targetUser: any = null;

      // 优先通过传入的 ID 查找（前端带过来的旧管理员 ID）
      if ("id" in body.admin && body.admin.id) {
        targetUser = await db.query.userTable.findFirst({
          where: {
            id: body.admin.id,
          },
        });
      }

      // 如果没传 ID，或者按 ID 没找到，则查找当前部门下是否已经有任何用户
      if (!targetUser) {
        targetUser = await db.query.userTable.findFirst({
          where: {
            deptId: departmentId,
          },
        });
      }

      if (targetUser) {
        // --- 逻辑：覆盖修改现有用户 ---

        // 安全性检查：如果用户想把 Email 改成一个已经被别人占用的 Email
        if (body.admin.email !== targetUser.email) {
          const emailConflict = await db.query.userTable.findFirst({
            where: {
              email: body.admin.email,
              id: {
                ne: targetUser.id,
              },
            },
          });
          if (emailConflict) {
            throw new HttpError.BadRequest(
              `邮箱 ${body.admin.email} 已被其他用户占用`
            );
          }
        }

        adminInfo = {
          id: targetUser.id,
          name: body.admin.name,
          email: body.admin.email,
        };

        // 1. 更新身份认证系统的密码（如果有）
        if (body.admin.password) {
          await auth.api.setUserPassword({
            body: {
              userId: targetUser.id,
              newPassword: body.admin.password,
            },
            headers,
          });
        }

        // 2. 更新数据库中的用户信息（包括可能的 Email 变更）
        await db
          .update(userTable)
          .set({
            name: body.admin.name,
            email: body.admin.email,
            phone: body.admin.phone || null,
            position: body.admin.position || null,
            updatedAt: new Date(),
          })
          .where(eq(userTable.id, targetUser.id));

        console.log("管理员用户已覆盖更新:", {
          id: targetUser.id,
          name: body.admin.name,
          email: body.admin.email,
        });
      } else {
        // --- 逻辑：该部门之前确实没管理员，创建新用户 ---
        const newUserResponse = await auth.api.createUser({
          body: {
            email: body.admin.email,
            password: body.admin.password || "123456", // 默认密码
            name: body.admin.name,
            role: "admin",
            data: {
              deptId: departmentId,
              tenantId,
              phone: body.admin.phone,
            },
          },
        });

        adminInfo = {
          id: newUserResponse.user.id,
          name: newUserResponse.user.name,
          email: newUserResponse.user.email,
        };

        console.log("新管理员创建完成，userId:", adminInfo.id);
      }

      // 步骤3：分配角色给用户
      const role = await db.query.roleTable.findFirst({
        where: {
          name: "工厂管理员",
        },
      });

      if (role) {
        await db
          .insert(userRoleTable)
          .values({
            userId: adminInfo.id,
            roleId: role.id,
          })
          .onConflictDoNothing();
      }
    }

    // 构造返回结果
    const result = {
      department: {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        category: dept.category,
      },
      site: {
        id: newSite.id,
        name: newSite.name,
        domain: newSite.domain,
        siteType: newSite.siteType,
      },
      ...(adminInfo && {
        admin: {
          id: adminInfo.id,
          name: adminInfo.name,
          email: adminInfo.email,
        },
      }),
    };

    console.log("=== 更新完成 ===");
    console.log(JSON.stringify(result, null, 2));

    return result;
  }
}
