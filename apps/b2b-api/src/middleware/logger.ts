// src/lib/logger.ts

import logixlysia from "@pori15/logixlysia";
import { Elysia } from "elysia";

import { isDatabaseError } from "~/utils/err/01guards";
import { mapDatabaseError } from "~/utils/err/02database-error-mapper";

export const loggerPlugin = new Elysia({ name: "loggerPlugin" })
  .use(
    logixlysia({
      // Phase 1: Transform - 将原始错误映射为标准错误
      transform: (error, { path }) => {
        return isDatabaseError(error) ? mapDatabaseError(error) : null;
      },
      config: {
        // showStartupMessage: true,
        startupMessageFormat: "simple",
        timestamp: { translateTime: "dd HH:MM:ss" },
        customLogFormat:
          "🦊 {now} {level} {duration} {method} {pathname} {status} {message} {ip}",
        ip: true,
        logFilePath: "./logs/app.log",
        error: {
          problemJson: {
            typeBaseUrl: "https://gin-shopping.com",
          },
        },
      },
    })
  )
  .as("global");
