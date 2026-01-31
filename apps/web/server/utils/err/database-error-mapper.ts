// src/errors/database-error-mapper.ts
// src/errors/database-error-mapper.ts
import { HttpError } from "@pori15/logixlysia";

import { DrizzleError, getPostgresError } from "./guards";
/**
 * Maps a database error to an appropriate HTTP error.
 *
 * @param error - Unknown error that has been identified as a database error
 * @returns A ProblemError instance with appropriate status code and message
 */
export function mapDatabaseError(
  error: DrizzleError
): InstanceType<(typeof HttpError)[keyof typeof HttpError]> {
  const pgError = getPostgresError(error);
  // ✅ 2. 这里的属性都有自动补全了，不再需要 ?. 瞎猜
  const { code, detail, constraint, message: rawMsg } = pgError;
  const column = pgError.column ?? "";
  // Problem JSON 扩展字段
  const extensions = {
    "x-pg-code": code,
    "x-constraint": constraint,
  };

  switch (code) {
    // === Integrity Constraint Violations (23xxx) ===

    case "23502": {
      // NOT NULL violation
      return new HttpError.BadRequest(
        `缺少必填字段: ${column || parseColumnFromMessage(rawMsg) || "必填字段为空"}`,
        extensions
      );
    }

    case "23503": {
      // FOREIGN KEY violation
      return new HttpError.BadRequest(
        `引用错误: 该记录正在被使用，无法删除或修改 (${parseConstraint(constraint)})`,
        extensions
      );
    }

    case "23505": {
      // UNIQUE constraint violation
      return new HttpError.Conflict(
        `重复数据: ${parseConstraint(constraint) || "该记录已存在"}`,
        extensions
      );
    }

    case "23514": {
      // CHECK or EXCLUSION violation
      return new HttpError.BadRequest(
        `数据验证失败: ${detail || "Check constraint violation"}`,
        extensions
      );
    }

    // === Transaction Exceptions (40xxx) ===

    case "40001": {
      // Serialization failure
      return new HttpError.ServiceUnavailable("事务冲突，请重试", extensions);
    }

    case "40P01": {
      // Deadlock detected
      return new HttpError.ServiceUnavailable(
        "数据库忙，请稍后重试",
        extensions
      );
    }

    // === Insufficient Resources (53xxx) ===

    case "53000":
    case "53100":
    case "53200":
    case "53300":
    case "53400": {
      // Various resource errors (disk full, out of memory, too many connections, etc.)
      return new HttpError.ServiceUnavailable(
        "数据库资源不足，请稍后重试",
        extensions
      );
    }

    // === System Errors (58xxx) ===

    case "58000":
    case "58030": {
      // System error or I/O error
      return new HttpError.ServiceUnavailable(
        "数据库系统错误，请联系管理员",
        extensions
      );
    }

    // === Connection/Protocol Errors (08xxx) ===

    case "08000":
    case "08001":
    case "08003":
    case "08004":
    case "08006":
    case "08007": {
      // Connection errors
      return new HttpError.ServiceUnavailable(
        "数据库连接失败，请稍后重试",
        extensions
      );
    }

    // === Default: Unknown database error ===
    default: {
      return new HttpError.InternalServerError(
        `数据库错误 [${code}]: ${stripQuery(rawMsg)}`,
        extensions
      );
    }
  }
}

/**
 * Get a human-readable error name for a PostgreSQL error code.
 */
export function getPostgresErrorName(code: string): string {
  const errorNames: Record<string, string> = {
    "23502": "NOT_NULL_VIOLATION",
    "23503": "FOREIGN_KEY_VIOLATION",
    "23505": "UNIQUE_VIOLATION",
    "23514": "CHECK_VIOLATION",
    "40001": "SERIALIZATION_FAILURE",
    "40P01": "DEADLOCK_DETECTED",
    "53000": "INSUFFICIENT_RESOURCES",
    "58000": "SYSTEM_ERROR",
    "08001": "CONNECTION_ERROR",
  };
  return errorNames[code] || "UNKNOWN_ERROR";
}

// 转换 snake_case 为 Title Case
function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// 从 NOT NULL 违反消息中解析列名
function parseColumnFromMessage(msg: string): string | null {
  const match = msg.match(/null value in column "(.*?)"/);
  return match?.[1] || null;
}

// 清理原始 SQL 消息
function stripQuery(msg: string): string {
  if (!msg) return "";
  const firstLine = msg.split("\n")[0];
  return firstLine ? firstLine.replace(/^Failed query:\s*/, "").trim() : "";
}

// 解析约束名称为可读消息
function parseConstraint(constraint: string): string {
  if (!constraint) return "违反数据库约束";

  const fieldMatch = constraint.match(/_(\w+?)(?:_key|_idx|_fkey)?$/);
  const field = fieldMatch?.[1];
  const prettyField = field ? toTitleCase(field.replace(/_/g, " ")) : null;

  if (constraint.includes("_key"))
    return `${prettyField ?? constraint} 必须唯一`;
  if (constraint.includes("_fkey"))
    return `${prettyField ?? constraint} 必须引用有效记录`;

  return `在 ${prettyField ?? constraint} 上违反约束`;
}

/**
 * 将底层数据库错误(如 Drizzle/PostgreSQL 抛出的)映射为语义化自定义错误
 * 同时附加原始 DB 错误信息作为扩展字段。
 */
// export function mapDatabaseError(error: {
//   code: string;
//   detail?: string;
//   message?: string;
//   constraint?: string;
//   column?: string;
// }) {
//   // 提取原始 PostgreSQL 错误对象（适配 Drizzle/或其他 ORM 包装的错误）
//   const pgError = extractOriginalPgError(error);

//   const code = pgError?.code;
//   const detail = pgError?.detail ?? "";
//   const constraint = pgError?.constraint ?? "";
//   const column = pgError?.column ?? "";
//   const rawMsg = pgError?.message ?? "";

//   // Problem JSON 扩展字段
//   const extensions = {
//     "x-pg-code": code,
//     "x-constraint": constraint,
//   };

//   switch (code) {
//     case "08006": // connection_failure (连接失败)
//       return new HttpError.ServiceUnavailable(
//         "数据库连接失败，请稍后重试",
//         extensions
//       );
//     case "28P01": // invalid_password (认证失败)
//       return new HttpError.InternalServerError("数据库认证失败");
//     case "23502": // not_null_violation (非空约束冲突)
//       return new HttpError.BadRequest(
//         `缺少必填字段: ${column || parseColumnFromMessage(rawMsg) || "必填字段为空"}`,
//         extensions
//       );
//     case "23503": // foreign_key_violation (外键约束冲突)
//       return new HttpError.BadRequest(
//         `外键违反: ${parseConstraint(constraint) || detail || "引用的记录不存在"}`,
//         extensions
//       );
//     case "23505": // unique_violation (唯一性约束冲突)
//       return new HttpError.Conflict(
//         `重复值错误: ${parseConstraint(constraint) || detail || "唯一字段已存在"}`
//       );
//     case "23514": // check_violation (数据检查约束冲突)
//       return new HttpError.BadRequest(
//         `数据校验失败: ${detail || "数据不符合校验规则"}`,
//         extensions
//       );
//     case "40P01": // deadlock_detected
//       return new HttpError.InternalServerError("数据库死锁，请重试");
//     case "57014": // query_canceled
//       return new HttpError.InternalServerError("数据库操作超时");
//     default:
//       return new HttpError.InternalServerError(
//         `数据库错误${code ? ` [${code}]` : ""}: ${stripQuery(rawMsg) || "未知数据库错误"}`
//       );
//   }
// }

// 提取原始 PostgreSQL 错误
function extractOriginalPgError(err: any): any {
  if (err?.cause && typeof err.cause === "object") return err.cause;
  return err;
}
