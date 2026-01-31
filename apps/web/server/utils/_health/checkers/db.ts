// modules/_health/checkers/db.ts
import { sql } from "drizzle-orm";

export async function checkDatabase(db: any) {
  try {
    // 执行一个最简单的查询
    await db.execute(sql`SELECT 1`);
    return { status: "OK", message: "Database connected" };
  } catch (error: any) {
    return {
      status: "FAIL",
      message: `Database Connection Error: ${error.message}`,
      suggestion: "请检查 PostgreSQL 服务是否启动，端口 5432 是否被占用。",
    };
  }
}
