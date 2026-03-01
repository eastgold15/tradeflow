import { SiteConfigContract } from "@repo/contract";
import { ServiceContext } from "~/middleware/site";
import { siteConfigCache } from "@/lib/cache/domain-cache";

export class SiteConfigService {
  public async list(
    query: SiteConfigContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search, key, keys } = query;

    // 单个 key 查询 - 使用缓存
    if (key && !search && !keys?.length) {
      return siteConfigCache.getOrFetch(ctx.site.id, key, async () => {
        return await ctx.db.query.siteConfigTable.findMany({
          where: {
            siteId: ctx.site.id,
            key,
          },
        });
      });
    }

    // 多个 key 查询或搜索 - 不使用缓存（实时查询）
    const res = await ctx.db.query.siteConfigTable.findMany({
      where: {
        siteId: ctx.site.id,
        ...(key ? { key } : {}),
        ...(keys?.length ? { key: { in: keys } } : {}),
        ...(search ? { key: { ilike: `%${search}%` } } : {}),
      },
    });
    return res;
  }
}
