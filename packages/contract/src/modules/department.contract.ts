import { t } from "elysia";
import { type InferDTO, spread } from "../helper/utils";
import { departmentTable } from "../table.schema";

/** [Auto-Generated] Do not edit this tag to keep updates. @generated */
export const DepartmentInsertFields = spread(departmentTable, "insert");
/** [Auto-Generated] Do not edit this tag to keep updates. @generated */
export const DepartmentFields = spread(departmentTable, "select");

/**
 * 部门管理扩展契约
 * 包含创建部门+站点+管理员的组合操作
 */

// 创建部门+站点+管理员的请求体
const CreateDepartmentWithSiteAndAdmin = t.Object({
  // 部门信息
  department: t.Object({
    name: t.String({ minLength: 2 }),
    code: t.String({ minLength: 2 }),
    category: t.Union([t.Literal("group"), t.Literal("factory")]),
    parentId: t.Union([t.String(), t.Null()], { default: null }),
    address: t.Optional(t.String()),
    contactPhone: t.Optional(t.String()),
    logo: t.Optional(t.String()),
    extensions: t.Optional(t.Any()), // JSON 字符串
  }),

  // 站点信息
  site: t.Object({
    name: t.String({ minLength: 2 }),
    domain: t.String({ minLength: 2 }),
    isActive: t.Optional(t.Boolean()),
  }),

  // 管理员用户信息
  admin: t.Object({
    name: t.String({ minLength: 2 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 6 }),
    phone: t.Optional(t.String()),
    position: t.Optional(t.String()),
  }),
});

// 更新部门+站点+管理员的请求体（管理员信息可选）
const UpdateDepartmentWithSiteAndAdmin = t.Object({
  // 部门信息（必填，id必填）
  department: t.Object({
    id: t.String(),
    name: t.String({ minLength: 2 }),
    code: t.String({ minLength: 2 }),
    category: t.Union([t.Literal("group"), t.Literal("factory")]),
    parentId: t.Union([t.String(), t.Null()], { default: null }),
    address: t.Optional(t.String()),
    contactPhone: t.Optional(t.String()),
    logo: t.Optional(t.String()),
    extensions: t.Optional(t.Any()),
  }),

  // 站点信息
  site: t.Object({
    name: t.String({ minLength: 2 }),
    domain: t.String({ minLength: 2 }),
    isActive: t.Optional(t.Boolean()),
  }),

  // 管理员用户信息（可选）
  admin: t.Optional(
    t.Object({
      id: t.Optional(t.String()), // 管理员 ID，用于更新现有用户
      name: t.String({ minLength: 2 }),
      email: t.String({ format: "email" }),
      password: t.Optional(t.String({ minLength: 6 })), // 密码可选，留空不修改
      phone: t.Optional(t.String()),
      position: t.Optional(t.String()),
    })
  ),
});

// 响应体
const CreateDepartmentWithSiteAndAdminResponse = t.Object({
  department: t.Object({
    id: t.String(),
    name: t.String(),
  }),
  site: t.Object({
    id: t.String(),
    name: t.String(),
    domain: t.String(),
  }),
  admin: t.Object({
    id: t.String(),
    name: t.String(),
    email: t.String(),
  }),
});

export const DepartmentContract = {
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Response: t.Object({
    ...DepartmentFields,
  }),
  CreateDepartmentWithSiteAndAdmin,
  UpdateDepartmentWithSiteAndAdmin,
  CreateDepartmentWithSiteAndAdminResponse,
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Create: t.Object({
    ...t.Omit(t.Object(DepartmentInsertFields), [
      "id",
      "createdAt",
      "updatedAt",
    ]).properties,
  }),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Update: t.Partial(
    t.Object({
      ...t.Omit(t.Object(DepartmentInsertFields), [
        "id",
        "createdAt",
        "updatedAt",
        "siteId",
      ]).properties,
    })
  ),

  ListQuery: t.Object({
    search: t.Optional(t.String()),
  }),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  ListResponse: t.Object({
    data: t.Array(t.Object({ ...DepartmentFields })),
    total: t.Number(),
  }),
} as const;

export type DepartmentContract = InferDTO<typeof DepartmentContract>;
