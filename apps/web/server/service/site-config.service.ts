import { SiteConfigContract } from "@repo/contract";
import { ServiceContext } from "~/middleware/site";

export class SiteConfigService {
  public async list(
    query: SiteConfigContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search, category, key, keys } = query;
    const res = await ctx.db.query.siteConfigTable.findMany({
      where: {
        siteId: ctx.site.id,
        ...(category ? { category } : {}),
        ...(key ? { key } : {}),
        ...(keys?.length ? { key: { in: keys } } : {}),
        ...(search ? { key: { ilike: `%${search}%` } } : {}),
      },
    });
    return res;
  }
}
