import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().min(1).max(65_535).default(9001),
    DATABASE_URL: z.string().min(1, "DATABASE_URL 是必需的"),
    AUTH_COOKIE: z.string().default("better-auth.session-token"),
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.coerce.number().default(465),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    DOMAIN: z.string().min(1, "DOMAIN 是必需的"),
  },
  client: {},
  runtimeEnv: {
    DOMAIN: process.env.DOMAIN,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_COOKIE: process.env.AUTH_COOKIE,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },
});
