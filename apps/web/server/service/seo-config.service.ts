import { type SeoConfigContract } from "@repo/contract";
import { ServiceContext } from "~/middleware/site";

export class SeoConfigService {
  public async list(
    query: SeoConfigContract["ListQuery"],
    ctx: ServiceContext
  ) {
    const { search, name } = query;
    const res = await ctx.db.query.seoConfigTable.findMany({
      where: {
        siteId: ctx.site.id,
        ...(name ? { name } : {}),
        ...(search ? { name: { ilike: `%${search}%` } } : {}),
      },
    });
    return res;
  }
}
