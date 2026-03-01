import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * 服务端变量：仅在 Node.js 环境可用。
   * 使用 z.coerce 将 process.env 的字符串自动转换为数字或布尔值。
   */
  server: {
    PORT: z.coerce.number().min(1).max(65_535).default(3000),
    // 必填项
    BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET 是必需的"),

    // 邮件服务（前端可能需要发送邮件）
    EMAIL_HOST: z.string().default("smtp.gmail.com"),
    EMAIL_PORT: z.coerce.number().min(1).max(65_535).optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  },

  /**
   * 客户端变量：可以在浏览器访问。
   * 必须以 NEXT_PUBLIC_ 开头。
   */
  client: {
    NEXT_PUBLIC_API_URL: z
      .url()
      .default("https://b2b-api-production-1.up.railway.app"), // 生产环境 API 地址
  },

  /**
   * 运行时映射：Next.js 要求的显式读取。
   * 注意：在这里直接传 process.env.XXX，Zod 的 coerce 会帮你转换类型。
   */
  runtimeEnv: {
    PORT: process.env.PORT,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,

    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,

    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },
});
