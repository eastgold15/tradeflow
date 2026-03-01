import type { ServiceContext } from "~/middleware/site";
import { adCache } from "@/lib/cache/domain-cache";

export class AdService {
  // 💡 注意：一定要接收 context (包含 db 和 siteId)
  async findCurrent(ctx: ServiceContext) {
    return adCache.getOrFetch(ctx.site.id, async () => {
      const now = new Date();
      return await ctx.db.query.adTable.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          siteId: ctx.site.id,
        }
      });
    });
  }
}
