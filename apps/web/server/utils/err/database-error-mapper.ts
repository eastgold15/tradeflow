// src/errors/database-error-mapper.ts
// src/errors/database-error-mapper.ts
import { HttpError } from "@pori15/logixlysia";

/**
 * 将底层数据库错误(如 Drizzle/PostgreSQL 抛出的)映射为语义化自定义错误
 * 同时附加原始 DB 错误信息作为扩展字段。
 */
export function mapDatabaseError(error: {
  code: string;
  detail?: string;
  message?: string;
  constraint?: string;
  column?: string;
}) {
  // 提取原始 PostgreSQL 错误对象（适配 Drizzle/或其他 ORM 包装的错误）
  const pgError = extractOriginalPgError(error);

  const code = pgError?.code;
  const detail = pgError?.detail ?? "";
  const constraint = pgError?.constraint ?? "";
  const column = pgError?.column ?? "";
  const rawMsg = pgError?.message ?? "";

  // Problem JSON 扩展字段
  const extensions = {
    "x-pg-code": code,
    "x-constraint": constraint,
  };

  switch (code) {
    case "08006": // connection_failure (连接失败)
      return new HttpError.ServiceUnavailable(
        "数据库连接失败，请稍后重试",
        extensions
      );
    case "28P01": // invalid_password (认证失败)
      return new HttpError.InternalServerError("数据库认证失败");
    case "23502": // not_null_violation (非空约束冲突)
      return new HttpError.BadRequest(
        `缺少必填字段: ${column || parseColumnFromMessage(rawMsg) || "必填字段为空"}`,
        extensions
      );
    case "23503": // foreign_key_violation (外键约束冲突)
      return new HttpError.BadRequest(
        `外键违反: ${parseConstraint(constraint) || detail || "引用的记录不存在"}`,
        extensions
      );
    case "23505": // unique_violation (唯一性约束冲突)
      return new HttpError.Conflict(
        `重复值错误: ${parseConstraint(constraint) || detail || "唯一字段已存在"}`
      );
    case "23514": // check_violation (数据检查约束冲突)
      return new HttpError.BadRequest(
        `数据校验失败: ${detail || "数据不符合校验规则"}`,
        extensions
      );
    case "40P01": // deadlock_detected
      return new HttpError.InternalServerError("数据库死锁，请重试");
    case "57014": // query_canceled
      return new HttpError.InternalServerError("数据库操作超时");
    default:
      return new HttpError.InternalServerError(
        `数据库错误${code ? ` [${code}]` : ""}: ${stripQuery(rawMsg) || "未知数据库错误"}`
      );
  }
}

// 提取原始 PostgreSQL 错误
function extractOriginalPgError(err: any): any {
  if (err?.cause && typeof err.cause === "object") return err.cause;
  return err;
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
