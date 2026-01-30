import { HttpError } from "@pori15/elysia-unified-error";
import { newsletterSubscriptionTable } from "@repo/contract";
import { eq } from "drizzle-orm";
import type { ServiceContext } from "~/middleware/site";

export class NewsletterService {
  /**
   * 订阅 Newsletter
   */
  async subscribe(ctx: ServiceContext, email: string) {
    // 检查是否已订阅
    const existing = await ctx.db.query.newsletterSubscriptionTable.findFirst({
      where: {
        email,
        siteId: ctx.site.id,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new HttpError.Conflict("该邮箱已订阅");
      }
      // 重新激活订阅
      await ctx.db
        .update(newsletterSubscriptionTable)
        .set({
          isActive: true,
          unsubscribedAt: null,
        })
        .where(eq(newsletterSubscriptionTable.id, existing.id));

      return {
        success: true,
        message: "重新订阅成功",
      };
    }

    // 新订阅
    await ctx.db.insert(newsletterSubscriptionTable).values({
      email,
      siteId: ctx.site.id,
      isActive: true,
      subscribedAt: new Date(),
    });

    return {
      success: true,
      message: "订阅成功",
    };
  }

  /**
   * 取消订阅
   */
  async unsubscribe(ctx: ServiceContext, email: string) {
    const existing = await ctx.db.query.newsletterSubscriptionTable.findFirst({
      where: {
        email,
        siteId: ctx.site.id,
      },
    });

    if (!existing) {
      throw new HttpError.NotFound("未找到订阅记录");
    }

    if (!existing.isActive) {
      throw new HttpError.Conflict("该订阅已取消");
    }

    await ctx.db
      .update(newsletterSubscriptionTable)
      .set({
        isActive: false,
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscriptionTable.id, existing.id));

    return {
      success: true,
      message: "取消订阅成功",
    };
  }

  /**
   * 检查订阅状态
   */
  async checkSubscription(ctx: ServiceContext, email: string) {
    const subscription =
      await ctx.db.query.newsletterSubscriptionTable.findFirst({
        where: {
          email,
          siteId: ctx.site.id,
        },
      });

    return {
      isSubscribed: !!subscription,
      isActive: subscription?.isActive ?? false,
    };
  }

  /**
   * 获取订阅列表（管理后台）
   */
  async getList(
    ctx: ServiceContext,
    params: { page?: number; limit?: number }
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const data = await ctx.db.query.newsletterSubscriptionTable.findMany({
      where: {
        siteId: ctx.site.id,
      },
      orderBy: {
        subscribedAt: "desc",
      },
      limit,
      offset,
    });

    const totalResult = await ctx.db
      .select({ count: newsletterSubscriptionTable.id })
      .from(newsletterSubscriptionTable)
      .where(eq(newsletterSubscriptionTable.siteId, ctx.site.id));

    return {
      data,
      total: totalResult.length,
    };
  }
}
