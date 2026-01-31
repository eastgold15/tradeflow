// src/plugins/error-logger.plugin.ts


import { Elysia } from "elysia";
import { loggerPlugin } from "~/middleware/logger";

// export const errorLoggerPlugin = new Elysia({
//   name: "error-logger-plugin",
// }).onError({ as: "global" }, ({ code, error, path, request }) => {
//   console.dir(error, { depth: null, colors: true });

//   console.log("===========");

//   const method = request?.method || "UNKNOWN";

//   let processedError: any = error;
//   let errorSource: "database" | "http" | "validation" | "unknown" = "unknown";

//   // --- 转换逻辑 ---
//   if (isDatabaseError(error)) {
//     errorSource = "database";
//     processedError = mapDatabaseError(error);
//   } else if (code === "VALIDATION") {
//     errorSource = "validation";
//     // 这里的 processedError.message 目前是巨大的 JSON
//   } else if (error && typeof error === "object" && "status" in error) {
//     errorSource = "http";
//   } else {
//     errorSource = "unknown";
//     processedError = new HttpError.InternalServerError(
//       (error as any)?.message || "Unknown Error"
//     );
//   }

//   // ========== 1. 静默写文件 (不输出到控制台) ==========
//   // log.pino.error({
//   //   event: "request_error",
//   //   source: errorSource,
//   //   path,
//   //   err: error,
//   //   validation: code === "VALIDATION" ? (error as any).all : undefined,
//   // });

//   // ========== 2. 开发环境精简美化打印 ==========
//   if (process.env.NODE_ENV === "development") {
//     const isVal = errorSource === "validation";
//     const displayMsg = isVal
//       ? getValidationSummary(error)
//       : processedError.message;

//     console.error(
//       `\n${chalk.red("═".repeat(30))} ${chalk.bold.red("ERROR")} ${chalk.red("═".repeat(30))}`
//     );
//     console.error(
//       `${chalk.bold.red("TYPE:")}    ${chalk.white(errorSource.toUpperCase())} (${chalk.yellow(code)})`
//     );
//     console.error(
//       `${chalk.bold.red("PATH:")}    ${chalk.cyan(`${method} ${path}`)}`
//     );
//     console.error(`${chalk.bold.red("MESSAGE:")} ${chalk.white(displayMsg)}`);

//     const filteredStack = filterStack((error as any)?.stack);
//     if (filteredStack.length > 0) {
//       console.error(chalk.bold.red("\nSOURCE:"));
//       filteredStack.forEach((line) => console.error(line));
//     } else {
//       // 如果过滤后啥也没了，至少给一行原始堆栈，防止没法跳转
//       console.error(
//         chalk.gray("\n(Internal stack trace hidden, original first line:)")
//       );
//       console.error(chalk.gray((error as any)?.stack?.split("\n")[1]));
//     }
//     console.error(`${chalk.red("═".repeat(66))}\n`);
//   }
// });

/**
 * 统一错误处理套件
 * 顺序：日志转换 -> 标准响应
 */
// export const errorSuite = new Elysia({ name: "error-suite" })
//   .use(errorLoggerPlugin) // 1. 先抓到，打印并 throw
//   .use(httpProblemJsonPlugin()) // 2. 接收 throw 出来的错误并返回 JSON
//   .as("global");
