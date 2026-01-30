// src/errors/database-error-mapper.ts
// src/errors/database-error-mapper.ts
import { HttpError } from "@pori15/elysia-unified-error";
import { type DrizzleError, getPostgresError } from "./01guards";

/**
 * 将底层数据库错误(如 Drizzle/PostgreSQL 抛出的)映射为语义化自定义错误
 * 同时附加原始 DB 错误信息作为扩展字段。
 */
export function mapDatabaseError(error: DrizzleError) {
  // ✅ 1. 安全提取原始错误 (利用 guards 中的辅助函数)
  const pgError = getPostgresError(error);

  // ✅ 2. 这里的属性都有自动补全了，不再需要 ?. 瞎猜
  const { code, detail, constraint, message: rawMsg } = pgError;
  const column = pgError.column ?? "";

  // Problem JSON 扩展字段
  const extensions = {
    "x-pg-code": code,
    "x-constraint": constraint,
  };

  // ✅ 3. 根据错误码映射
  switch (code) {
    case "08006":
      return new HttpError.ServiceUnavailable("数据库连接失败，请稍后重试", extensions);
    case "23502":
      return new HttpError.BadRequest(
        `缺少必填字段: ${column || parseColumnFromMessage(rawMsg) || "必填字段为空"}`,
        extensions
      );
    case "23503":
      return new HttpError.BadRequest(
        `引用错误: 该记录正在被使用，无法删除或修改 (${parseConstraint(constraint)})`,
        extensions
      );
    case "23505":
      return new HttpError.Conflict(
        `重复数据: ${parseConstraint(constraint) || "该记录已存在"}`,
        extensions
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
        `数据库错误 [${code}]: ${stripQuery(rawMsg)}`,
        extensions
      );
  }
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
