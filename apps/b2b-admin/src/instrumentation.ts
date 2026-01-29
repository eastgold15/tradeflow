// instrumentation.ts



export function register() {
  console.log("--- NEXT.JS RUNTIME STARTING ---");
  console.log("PORT:", process.env.PORT);
  console.log("APP_HOST:", process.env.APP_HOST);
  console.log("APP_URL:", process.env.APP_URL);
  console.log("--------------------------------");
  console.log("--- 环境变量 ---");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "***已配置***" : "未配置");
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("AUTH_COOKIE:", process.env.AUTH_COOKIE);
  console.log("NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
  console.log("--------------------------------");

  // 🔥 执行启动检查（数据库 + 邮件服务）
  // await performStartupCheck();
}
