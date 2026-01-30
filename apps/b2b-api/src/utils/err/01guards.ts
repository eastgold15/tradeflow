// src/errors/guards.ts

const POSTGRES_ERROR_CODE_REGEX = /^[0-9A-Z]{5}$/;

// 1. 定义 Drizzle 抛出的外层错误结构
export interface DrizzleError extends Error {
  name: string;
  message: string;
  query: string;
  params: unknown[];
  // Drizzle 将真实的 Postgres 错误包裹在 cause 中
  cause: PostgresError;
}



// 2. 定义内层的原始 PostgreSQL 错误结构
export interface PostgresError {
  name: string;
  severity:
  | "ERROR"
  | "FATAL"
  | "PANIC"
  | "WARNING"
  | "NOTICE"
  | "DEBUG"
  | "INFO"
  | "LOG";
  code: string; // SQLSTATE (e.g., "23503")
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint: string;
  file?: string;
  line?: string;
  routine?: string;
  length: number;
  stack: string;
  message: string;
}

/**
 * 类型守卫：判断是否为 Drizzle/Postgres 数据库错误
 * 逻辑：检查 error.cause.code 是否符合 Postgres 错误码格式
 */
export function isDatabaseError(error: unknown): error is DrizzleError {
  if (!error || typeof error !== "object") return false;

  const err = error as any;

  // 1. 检查是否拥有 DrizzleError 的特征 (cause)
  if (!("cause" in err && err.cause) || typeof err.cause !== "object") {
    return false;
  }

  // 2. 检查 cause 内部是否有 Postgres 的 code
  const cause = err.cause as Partial<PostgresError>;
  if (!cause.code || typeof cause.code !== "string") {
    return false;
  }

  // 3. 正则校验 code 格式 (5位字符)
  return POSTGRES_ERROR_CODE_REGEX.test(cause.code);
}

/**
 * 辅助函数：直接提取内部的 PostgresError
 * 只有通过了 isDatabaseError 检查才应该调用此函数
 */
export function getPostgresError(error: DrizzleError): PostgresError {
  return error.cause;
}

// 错误码列表：https://www.postgresql.org/docs/current/errcodes-appendix.html

// {
//   "query": "delete from \"media\" where (\"media\".\"id\" in ($1) and \"media\".\"tenant_id\" = $2)",
//     "params": [
//       "be52d899-b0a6-4bb3-806a-df83a629fa6e",
//       "019b82f7-76b7-707e-8452-bf6383bf8217"
//     ],
//       "cause": {
//     "length": 356,
//       "name": "error",
//         "severity": "ERROR",
//           "code": "23503",
//             "detail": "Key (id)=(be52d899-b0a6-4bb3-806a-df83a629fa6e) is still referenced from table \"product_media\".",
//               "schema": "public",
//                 "table": "product_media",
//                   "constraint": "product_media_media_id_media_id_fkey",
//                     "file": "ri_triggers.c",
//                       "routine": "ri_ReportViolation",
//                         "stack": "error: update or delete on table \"media\" violates foreign key constraint \"product_media_media_id_media_id_fkey\" on table \"product_media\"\n    at <anonymous> (G:\\shop\\node_modules\\.bun\\pg-pool@3.10.1+635858982ab829dd\\node_modules\\pg-pool\\index.js:45:11)\n    at processTicksAndRejections (native:7:39)",
//                           "message": "update or delete on table \"media\" violates foreign key constraint \"product_media_media_id_media_id_fkey\" on table \"product_media\""
//   },
//   "name": "Error",
//     "message": "Failed query: delete from \"media\" where (\"media\".\"id\" in ($1) and \"media\".\"tenant_id\" = $2)\nparams: be52d899-b0a6-4bb3-806a-df83a629fa6e,019b82f7-76b7-707e-8452-bf6383bf8217",
//       "stack": "Error: Failed query: delete from \"media\" where (\"media\".\"id\" in ($1) and \"media\".\"tenant_id\" = $2)\nparams: be52d899-b0a6-4bb3-806a-df83a629fa6e,019b82f7-76b7-707e-8452-bf6383bf8217\n    at <anonymous> (G:\\shop\\node_modules\\.bun\\drizzle-orm@1.0.0-beta.9-e89174b+2ea31dade9daf5b8\\node_modules\\drizzle-orm\\pg-core\\async\\session.js:39:14)\n    at processTicksAndRejections (native:7:39)"
// }
