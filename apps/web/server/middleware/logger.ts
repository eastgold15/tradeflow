// src/lib/logger.ts

import logixlysia from "@pori15/logixlysia";
import { Elysia } from "elysia";
import { mapDatabaseError } from "~/utils/err/database-error-mapper";
import { isDatabaseError } from "~/utils/err/guards";
export const loggerPlugin = new Elysia({ name: "loggerPlugin" }).use(
  logixlysia({
    // Phase 1: Transform - 将原始错误映射为标准错误
    transform: (error) => {
      console.log('[error]:', error)
      return isDatabaseError(error) ? mapDatabaseError(error) : null;
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
      },
    },
  })
);
