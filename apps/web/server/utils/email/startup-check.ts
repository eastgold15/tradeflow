/**
 * 邮件服务启动验证
 * 在应用启动时验证邮件配置是否正确
 */

import { verifyEmailConnection } from "./email";

/**
 * 验证邮件配置
 */
export async function validateEmailConfig(): Promise<void> {
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
  console.log("requiredConfigs:", JSON.stringify(requiredConfigs, null, 2));
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
