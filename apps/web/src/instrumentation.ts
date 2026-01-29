// instrumentation.ts

import { performStartupCheck } from "~/lib/startup/startup-check";

export async function register() {
  console.log("--- NEXT.JS RUNTIME STARTING ---");
  console.log("PORT:", process.env.PORT);
  console.log("APP_HOST:", process.env.APP_HOST);
  console.log("APP_URL:", process.env.APP_URL);
  console.log("--------------------------------");

  // 🔥 执行启动检查（数据库 + 邮件服务）
  await performStartupCheck();
}
