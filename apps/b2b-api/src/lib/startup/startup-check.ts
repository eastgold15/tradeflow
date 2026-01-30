/**
 * 🚀 启动检查插件
 * --------------------------------------------------------
 * 在 Elysia 应用启动时验证数据库和邮件服务配置
 * 使用 onStart 生命周期钩子确保在应用启动前完成验证
 * --------------------------------------------------------
 */

import { HttpError } from "@pori15/elysia-http-problem-json";
import { Elysia } from "elysia";
import { db } from "~/db/connection";

/**
 * 数据库连接验证
 */
async function validateDatabaseConnection(): Promise<boolean> {
  console.log(`\n${"=".repeat(60)}`);
  console.log("🗄️  数据库连接检查");
  console.log("=".repeat(60));

  try {
    // 执行一个简单的查询来验证数据库连接
    await db.execute("SELECT 1");
    console.log("✅ 数据库连接成功！");
    console.log(`${"=".repeat(60)}\n`);
    return true;
  } catch (error) {
    console.error("❌ 数据库连接失败！");

    if (error instanceof Error) {
      console.error(`错误信息: ${error.message}`);
    }

    console.log("\n🔧 解决方案:");
    console.log("1. 检查 DATABASE_URL 环境变量是否正确配置");
    console.log("2. 确认数据库服务是否正在运行");
    console.log("3. 检查网络连接和防火墙设置");
    console.log("4. 验证数据库用户名和密码是否正确");

    console.log("\n⚠️  应用将无法正常运行，请修复后重启");
    console.log(`${"=".repeat(60)}\n`);
    return false;
  }
}

/**
 * 启动检查插件
 *
 * 使用方式:
 * ```ts
 * import { startupCheckPlugin } from "~/lib/startup/startup-check";
 *
 * new Elysia()
 *   .use(startupCheckPlugin)
 *   .get("/", () => "Hello World");
 * ```
 */
export const startupCheckPlugin = new Elysia({ name: "startup-check" })
  .onStart(async () => {
    console.log("\n🚀 启动系统检查...\n");

    // 并行执行数据库和邮件验证
    const [dbOk] = await Promise.all([
      validateDatabaseConnection(),
      // validateEmailConfig().catch(() => {
      //   // 邮件验证失败不阻止应用启动
      //   return false;
      // }),
    ]);

    // 数据库连接失败则阻止应用启动
    if (!dbOk) {
      throw new HttpError.InternalServerError("数据库连接失败，应用无法启动");
    }

    console.log("✅ 启动检查完成\n");
  })
  .as("global");
