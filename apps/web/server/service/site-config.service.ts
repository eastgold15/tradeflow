import { SiteConfigContract } from "@repo/contract";
import { ServiceContext } from "~/middleware/site";

export class SiteConfigService {
  public async list(
    query: SiteConfigContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search, key, keys } = query;
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
