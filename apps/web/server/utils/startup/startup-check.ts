/**
 * 🚀 启动检查工具
 * --------------------------------------------------------
 * 在 Next.js + Elysia 集成模式下验证数据库和邮件服务配置
 * 注意：由于 Elysia 作为 API 路由处理器运行，onStart 钩子不会触发
 * 因此使用模块顶层的自执行模式
 * --------------------------------------------------------
 */

import { db } from "~/db/connection";
import { verifyEmailConnection } from "~/lib/email/email";

const checkPerformed = false;

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
 * 邮件服务配置验证
 */
async function validateEmailConfig(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log("📧 Gina 询价系统 - 邮件服务检查");
  console.log("=".repeat(60));

  // 检查必要的配置项
  const requiredConfigs = {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: Number(process.env.EMAIL_PORT),
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  const missingConfigs: string[] = [];
  let configValid = true;

  console.log("\n📋 检查配置项:");
  // 检查配置是否完整
  Object.entries(requiredConfigs).forEach(([key, value]) => {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      console.log(`  ❌ ${key}: 未配置`);
      missingConfigs.push(key);
      configValid = false;
    } else {
      const displayValue = key.includes("PASSWORD") ? "***已配置***" : value;
      console.log(`  ✅ ${key}: ${displayValue}`);
    }
  });

  if (!configValid) {
    console.log(`\n${"⚠️".repeat(20)}`);
    console.log("❌ 邮件服务配置不完整！");
    console.log("⚠️".repeat(20));

    console.log("\n缺少的配置项:");
    missingConfigs.forEach((config) => {
      console.log(`  • ${config}`);
    });

    console.log("\n🔧 解决方案:");
    console.log("1. 编辑 apps/web/.env 文件");
    console.log("2. 添加缺少的邮件配置");
    console.log("3. QQ邮箱用户须知:");
    console.log("   - 需开启SMTP服务（邮箱设置 → 账户 → SMTP服务）");
    console.log("   - EMAIL_PASSWORD 使用授权码，不是QQ密码");
    console.log("   - 获取授权码: https://mail.qq.com");
    console.log("4. 重启应用以重新加载配置");

    console.log("\n📝 当前状态:");
    console.log("⚠️  询价功能将使用开发模式");
    console.log("   - 邮件内容输出到控制台");
    console.log("   - 不会实际发送邮件");
    console.log("   - 适合开发和测试环境");

    console.log(`\n${"=".repeat(60)}`);
    return;
  }

  // 如果配置完整，尝试连接邮件服务器
  try {
    console.log("\n🔌 连接邮件服务器...");
    const result = await verifyEmailConnection();

    if (result.success) {
      if (result.devMode) {
        console.log("\n📋 运行模式: 开发模式");
        console.log("• 邮件内容将输出到控制台");
        console.log("• 不会实际发送邮件");
        console.log("• 适合开发和测试");
      } else {
        console.log("\n✅ 邮件服务连接成功！");
        console.log(
          `📮 服务器: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`
        );
        console.log(`📨 发件人: ${process.env.EMAIL_FROM}`);
        console.log("🎉 系统已准备好发送询价通知邮件");
      }
    } else {
      console.log(`\n${"❌".repeat(20)}`);
      console.log("邮件服务器连接失败！");
      console.log("❌".repeat(20));

      if (result.error instanceof Error) {
        console.log(`\n错误详情: ${result.error.message}`);
      }

      console.log("\n🔧 常见解决方案:");
      console.log("1. QQ邮箱相关:");
      console.log("   • 登录 https://mail.qq.com");
      console.log("   • 设置 → 账户 → 开启SMTP服务");
      console.log("   • 重新生成授权码");
      console.log("2. 检查网络连接和防火墙设置");
      console.log("3. 确认邮箱服务器地址和端口");
      console.log("4. 尝试使用其他邮箱服务");

      console.log("\n⚠️  询价功能影响:");
      console.log("   • 无法发送邮件通知给业务员");
      console.log("   • 用户提交的询价只能查看，无法邮件通知");
      console.log("   • 建议尽快修复以确保业务正常运行");
    }
  } catch (error) {
    console.log("\n❌ 验证过程中发生未知错误");
    if (error instanceof Error) {
      console.log(`错误信息: ${error.message}`);
    }
    console.log("请检查配置或联系技术支持");
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("邮件服务检查完成 ✓");
  console.log(`${"=".repeat(60)}\n`);
}

/**
 * 执行启动检查（单例模式）
 *
 * 在 Next.js + Elysia 集成模式下，将此函数放在 route.ts 的模块顶层
 *
 * @returns {Promise<boolean>} 数据库连接是否成功
 */
let checkPromise: Promise<boolean> | null = null;

export function performStartupCheck(): Promise<boolean> {
  // 使用 promise 缓存，确保只执行一次且等待完成
  if (checkPromise) {
    return checkPromise;
  }

  console.log("\n🚀 启动系统检查...\n");

  checkPromise = (async () => {
    const [dbOk] = await Promise.all([
      validateDatabaseConnection(),
      validateEmailConfig().catch(() => {
        return undefined;
      }),
    ]);
    console.log("✅ 启动检查完成\n");
    return dbOk ?? false;
  })();

  return checkPromise;
}

/**
 * 显示邮件配置状态摘要
 */
export function showEmailConfigSummary(): void {
  console.log("\n📧 邮件服务配置摘要:");
  console.log(`  主机: ${process.env.EMAIL_HOST || "未配置"}`);
  console.log(`  端口: ${process.env.EMAIL_PORT || "未配置"}`);
  console.log(`  用户: ${process.env.EMAIL_USER || "未配置"}`);
  console.log(`  密码: ${process.env.EMAIL_PASSWORD ? "已配置" : "未配置"}`);
  console.log(`  发件人: ${process.env.EMAIL_FROM || "未配置"}`);
}
