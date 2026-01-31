import { HttpError } from "@pori15/logixlysia";
import { Elysia } from "elysia";
import { dbPlugin } from "~/db/connection";
import { auth } from "~/lib/auth";
import type { DBtype } from "~/lib/type";

// 系统没有超管，每个用户登录之后，一定有租户ID、工厂ID等信息，用户信息及部门id 都放在上下文中// 请求头名称

// 请求头名称：用于指定当前操作的部门ID
const CURRENT_DEPT_HEADER = "x-current-dept-id";
export const authGuardMid = new Elysia({ name: "authGuard" })
  .use(dbPlugin)
  .derive(async ({ request, db }) => {
    const headers = request.headers;
    const session = await auth.api.getSession({ headers });
    if (!session) throw new HttpError.Unauthorized("未登录");

    const currentDeptIdFromHeader = request.headers.get(CURRENT_DEPT_HEADER);

    // 1. 先获取用户最原始的权限和默认上下文（默认上下文包含用户所在的初始部门）
    let userRolePermission = await getUserWithRoles(
      session.user.id,
      db
      // 注意：这里第一次调用没传 targetDept?.category，获取的是默认权限
    );

    // 2. 如果用户通过 Header 切换了部门
    if (currentDeptIdFromHeader) {
      const targetDept = await db.query.departmentTable.findFirst({
        where: {
          id: currentDeptIdFromHeader,
          tenantId: userRolePermission.context.tenantId, // 确保不能跨租户访问
        },
        with: { site: true },
      });

      if (targetDept) {
        /**
         * 重要注释：
         * 此时 userRolePermission.context.department 将被更新为 targetDept。
         * 这意味着在后续的 Service 层中：
         * user.context.department.id === currentDeptId (来自 Header)
         * 结论：对于使用了 requireDept 宏的接口，user.context.department
         * 和注入的 currentDeptId 指向的是同一个物理部门。
         */
        userRolePermission = {
          ...userRolePermission,
          context: {
            ...userRolePermission.context,
            department: {
              id: targetDept.id,
              name: targetDept.name,
              category: targetDept.category,
              parentId: targetDept.parentId,
            },
            site: {
              id: targetDept.site.id,
              name: targetDept.site.name,
              domain: targetDept.site.domain,
              siteType: targetDept.site.siteType,
            },
          },
        };
      }
    }

    return {
      user: userRolePermission,
    };
  })
  // 2. 定义宏
  .macro({
    /**
     * 权限校验宏
     * 用法: { allPermissions: ['USER:READ'] }
     */
    allPermissions: (names: string[]) => ({
      beforeHandle({ user, status }) {
        if (!user) throw new HttpError.Forbidden("您没有任何权限");
        if (!user.permissions) {
          throw new HttpError.Forbidden("您没有任何权限");
        }
        for (const n of names) {
          if (
            !(user.permissions.includes(n) || user.permissions.includes("*"))
          ) {
            return status(403, `权限不足，需要 ${n} 权限`);
          }
        }
      },
    }),

    /**
     * 部门上下文校验宏
     * 作用：
     * 1. 强制要求请求头必须带上 x-current-dept-id
     * 2. 校验该部门是否属于当前用户所在的租户
     * 3. 将该 ID 作为一个独立变量 currentDeptId 注入到 Handler 的参数中
     */
    requireDept: {
      resolve: async ({ request, db, user }) => {
        const currentDeptId = request.headers.get(CURRENT_DEPT_HEADER);
        if (!currentDeptId) {
          throw new HttpError.BadRequest("请选择当前操作的部门");
        }
        if (!user) throw new HttpError.Forbidden("您没有任何权限");

        const userTenantId = user.context.tenantId; // 新 DTO 结构

        const targetDept = await db.query.departmentTable.findFirst({
          where: { id: currentDeptId },
          columns: { id: true, tenantId: true },
        });

        if (!targetDept || targetDept.tenantId !== userTenantId) {
          throw new HttpError.Forbidden("无权访问该部门");
        }

        // ✅ 返回注入的变量
        return {
          currentDeptId,
        };
      },
    },
  })
  .as("global");

// --- 辅助函数保持不变 ---

async function getUserWithRoles(
  userID: string,
  db: DBtype,
  deptCategory?: string
) {
  const rawUser = await db.query.userTable.findFirst({
    where: { id: userID },
    with: {
      roles: {
        with: {
          permissions: {
            columns: {
              name: true,
            },
          },
        },
      },
      department: {
        columns: {
          id: true,
          name: true,
          category: true,
          parentId: true,
          tenantId: true,
        },
        with: {
          site: true,
        },
      },
    },
  });

  if (!rawUser) throw new HttpError.NotFound("用户不存在");

  // --- 数据清洗 (Transformer) ---
  // 1. 扁平化权限 (去重)
  const permissions = Array.from(
    new Set(
      rawUser.roles
        .flatMap((role) => role.permissions.map((p) => p.name))
        .filter(Boolean)
    )
  );

  let permissionWithDeptCategory = permissions;
  switch (deptCategory) {
    case "factory":
      permissionWithDeptCategory = permissions.filter(
        (p) => !FACTORY_NO_PERMISSIONS.includes(p)
      );
      break;
    case "group":
      permissionWithDeptCategory = permissions.filter(
        (p) => !GROUPSITE_NO_PERMISSIONS.includes(p)
      );
      break;
    default:
      break;
  }

  // 2. 提取角色名
  const roles = rawUser.roles.map((r) => ({
    name: r.name,
    dataScope: r.dataScope,
  }));
  // 3. 构建上下文 (Context)
  // 注意：由于 tenantId, deptId, site.boundDeptId 都是必填的，所以这些值一定存在
  const context = {
    tenantId: rawUser.tenantId, // ✅ 必填
    department: {
      id: rawUser.department.id,
      name: rawUser.department.name,
      category: rawUser.department.category,
      parentId: rawUser.department.parentId,
    },
    site: {
      id: rawUser.department.site.id,
      name: rawUser.department.site.name,
      domain: rawUser.department.site.domain,
      siteType: rawUser.department.site.siteType,
    },
  };

  // 4. 返回清洗后的对象
  return {
    id: rawUser.id,
    name: rawUser.name,
    email: rawUser.email,
    image: rawUser.image,
    phone: rawUser.phone,
    position: rawUser.position,
    isSuperAdmin: !!rawUser.isSuperAdmin,
    context,
    roles,
    permissions: permissionWithDeptCategory,
  };
}

export type UserDto = Awaited<NonNullable<ReturnType<typeof getUserWithRoles>>>;

const FACTORY_NO_PERMISSIONS = ["SITES_MANAGE", "TENANTS_MANAGE"];

// 集团站权限
const GROUPSITE_NO_PERMISSIONS = [
  "SKU_CREATE",
  "SKU_DELETE",
  "PRODUCT_CREATE",
  "PRODUCT_DELETE",
];
