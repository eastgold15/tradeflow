import openapi, { fromTypes } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { appRouter } from "~/controllers/app-router";
import { dbPlugin } from "~/db/connection";
import { loggerPlugin } from "~/middleware/logger";
import { siteMiddleware } from "~/middleware/site";
import { errorSuite } from "~/utils/err/errorSuite.plugin";

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ 未捕获的拒绝:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ 未捕获的异常:", error);
});

/**
 * 使用 server.ts 中定义的服务器实例
 * 设置 /api 前缀以匹配路由路径
 * 注意：启动检查已在 instrumentation.ts 中执行
 */
const app = new Elysia({ name: "app", prefix: "/api" })
  .use(dbPlugin)
  .use(
    openapi({
      documentation: {
        info: {
          title: "Gina Shopping API",
          version: "1.0.71",
          description: "基于 Elysia + Drizzle + TypeScript 的电商 API",
        },
        tags: [],
      },
      references: fromTypes(
        process.env.NODE_ENV === "production"
          ? "dist/index.d.ts"
          : "server/server.ts",
        {
          // 关键：指定项目根目录，以便编译器能找到 tsconfig.json 和其他文件
          // 这里使用 import.meta.dir (Bun) 或 process.cwd()
          projectRoot: process.cwd(),
          // 如果你的 tsconfig 在根目录
          tsconfigPath: "tsconfig.json",
          debug: process.env.NODE_ENV !== "production",
        }
      ),
    })
  )
  // 1. 日志插件 - 记录所有请求
  .use(loggerPlugin)
  // 2. 错误处理插件 - 统一错误处理
  .use(errorSuite)
  // 4. 站点中间件
  .use(siteMiddleware)
  // 自动挂载所有控制器（包括自定义和生成的）
  .use(appRouter);

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const DELETE = app.handle;
export const PATCH = app.handle;

export type App = typeof app;
