import { HttpError } from "@pori15/logixlysia";
import { dailyInquiryCounterTable } from "@repo/contract";
import { eq, sql } from "drizzle-orm";

import { db } from "~/db/connection";

function getYYMMDD(date: Date = new Date()): string {
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
/**
 * 生成今日唯一递增单号，格式：INQ{YYYYMMDD}-{NNN}
 * 例如：INQ251209-001
 */
export async function generateInquiryNumber(): Promise<string> {
  const today = new Date();
  const dateKey = getYYMMDD(today);

  // 🔁 使用 upsert（PostgreSQL: ON CONFLICT / MySQL: ON DUPLICATE KEY）
  // 先尝试插入 count=1，如果存在则 count = count + 1
  await db
    .insert(dailyInquiryCounterTable)
    .values({ date: dateKey, count: 1 })
    .onConflictDoUpdate({
      target: dailyInquiryCounterTable.date,
      set: {
        count: sql`${dailyInquiryCounterTable.count} + 1`,
      },
    });

  // 获取当前 count
  const [row] = await db
    .select({ count: dailyInquiryCounterTable.count })
    .from(dailyInquiryCounterTable)
    .where(eq(dailyInquiryCounterTable.date, dateKey));

  if (!row) {
    throw new HttpError.ServiceUnavailable("Failed to generate inquiry number");
  }

  const seq = String(row.count).padStart(3, "0"); // 001, 002, ..., 999
  return `INQ${dateKey}-${seq}`;
}
