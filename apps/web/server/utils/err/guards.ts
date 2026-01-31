// src/errors/guards.ts

/**
 * Database Error Type Guards
 *
 * Duck typing detection for Drizzle ORM database errors.
 *
 * Drizzle wraps PostgreSQL errors with this structure:
 * - error.cause: The original PostgresError
 * - error.cause.code: 5-character PostgreSQL error code (e.g., "23505")
 *
 * PostgreSQL Error Classes:
 * - 23xxx: Integrity Constraint Violation
 *   - 23502: NOT NULL violation
 *   - 23503: FOREIGN KEY violation
 *   - 23505: UNIQUE constraint violation
 * - 40xxx: Transaction Exception
 * - 53xxx: Insufficient Resources
 * - 58xxx: System Error
 */

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

/**
 * PostgreSQL Error Code Reference
 *
 * Class 23 - Integrity Constraint Violation:
 * - 23502: not_null_violation
 * - 23503: foreign_key_violation
 * - 23505: unique_violation
 * - 23514: check_violation
 * - 23514: exclusion_violation
 *
 * Class 40 - Transaction Exception:
 * - 40001: serialization_failure
 * - 40P01: deadlock_detected
 *
 * Class 53 - Insufficient Resources:
 * - 53000: insufficient_resources
 * - 53100: disk_full
 * - 53200: out_of_memory
 * - 53300: too_many_connections
 * - 53400: configuration_limit_exceeded
 *
 * Class 58 - System Error:
 * - 58000: system_error
 * - 58030: io_error
 */
export const PostgresErrorCode = {
  NOT_NULL_VIOLATION: "23502",
  FOREIGN_KEY_VIOLATION: "23503",
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",
  EXCLUSION_VIOLATION: "23514",
  SERIALIZATION_FAILURE: "40001",
  DEADLOCK_DETECTED: "40P01",
  INSUFFICIENT_RESOURCES: "53000",
  DISK_FULL: "53100",
  OUT_OF_MEMORY: "53200",
  TOO_MANY_CONNECTIONS: "53300",
  CONFIGURATION_LIMIT_EXCEEDED: "53400",
  SYSTEM_ERROR: "58000",
  IO_ERROR: "58030",
} as const;
