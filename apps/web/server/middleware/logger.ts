// src/lib/logger.ts

import logixlysia from "@pori15/logixlysia";
import { Elysia } from "elysia";
import { mapDatabaseError } from "~/utils/err/database-error-mapper";
import { isDatabaseError } from "~/utils/err/guards";
export const loggerPlugin = new Elysia({ name: "loggerPlugin" }).use(
  logixlysia({
    // Phase 1: Transform - 将原始错误映射为标准错误
    transform: (error) => {
      console.log("[error]:", error);

      // 如果是数据库错误，进行映射
      if (isDatabaseError(error)) {
        return mapDatabaseError(error);
      }

      // 对于其他错误，不要返回 null！
      // 直接返回原始错误，normalizeToProblem 会处理它
      // 或者你可以在这里添加更多的错误类型处理

      return error; // 返回原始错误，而不是 null
    },
    config: {
      // showStartupMessage: true,
      startupMessageFormat: "simple",
      timestamp: { translateTime: "dd HH:MM:ss" },
      customLogFormat:
        "🦊 {now} {level} {duration} {method} {pathname} {status} {message} {ip}",
      ip: true,
      error: {
        problemJson: {
          typeBaseUrl: "https://gin-shopping.com",
        },
        verboseErrorLogging: true,
      },
    },
  })
);
